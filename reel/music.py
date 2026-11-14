"""Gentle music-box bed, synthesised from scratch (no samples, no licence). Usage: music.py out.wav seconds"""
import sys, wave, numpy as np
SR = 48000
dur = float(sys.argv[2]); out = sys.argv[1]
bpm = 100; beat = 60 / bpm; bar = 4 * beat
n = int((dur + 3) * SR); L = np.zeros(n); R = np.zeros(n)
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def put(buf, t, sig):
    i = int(t * SR); j = min(n, i + len(sig)); buf[i:j] += sig[: j - i]
def musicbox(f, length=1.6, vel=0.25):
    t = np.arange(int(length * SR)) / SR
    env = np.exp(-t * 3.2) * (1 - np.exp(-t * 400))
    s = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*2*f*t)*np.exp(-t*6) + 0.12*np.sin(2*np.pi*3.01*f*t)*np.exp(-t*9)
    return vel * env * s
def bass(f, length, vel=0.18):
    t = np.arange(int(length * SR)) / SR
    env = np.minimum(1, t / 0.05) * np.exp(-t * 0.9)
    return vel * env * (np.sin(2*np.pi*f*t) + 0.2*np.sin(2*np.pi*2*f*t))
# C - G - Am - F, arpeggiated in eighths, melody notes on top
chords = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [60, 64, 69, 72]), (41, [60, 65, 69, 72])]
pattern = [0, 1, 2, 3, 2, 1, 2, 3]
melody = [[76, None, 79, None], [74, None, 71, None], [72, None, 76, None], [77, None, 76, 74]]
rng = np.random.default_rng(7)
t0 = 0.0; k = 0
while t0 < dur + 1:
    root, notes = chords[k % 4]
    put(L, t0, bass(midi(root), bar)); put(R, t0, bass(midi(root), bar))
    for i, p in enumerate(pattern):
        s = musicbox(midi(notes[p]), vel=0.11 + 0.02 * rng.random())
        pan = 0.35 + 0.3 * (p / 3)
        tt = t0 + i * beat / 2 + 0.004 * rng.standard_normal()
        put(L, tt, s * (1 - pan)); put(R, tt, s * pan)
    if k >= 1:  # melody enters after the first bar
        for i, m in enumerate(melody[k % 4]):
            if m: s = musicbox(midi(m), 2.2, 0.16); put(L, t0 + i*beat, s*0.5); put(R, t0 + i*beat, s*0.5)
    t0 += bar; k += 1
# simple stereo reverb: decaying noise impulse response
ir_len = int(1.8 * SR); t = np.arange(ir_len) / SR
def ir(seed): return np.random.default_rng(seed).standard_normal(ir_len) * np.exp(-t * 3.0) * 0.02
def conv(x, h):
    m = len(x) + len(h); N = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(h, N), N)[: len(x)]
L, R = L + 0.5 * conv(L, ir(1)), R + 0.5 * conv(R, ir(2))
m = int(dur * SR); L, R = L[:m], R[:m]
fade = int(1.5 * SR); ramp = np.linspace(1, 0, fade); L[-fade:] *= ramp; R[-fade:] *= ramp
x = np.stack([L, R], 1); x /= np.abs(x).max() / 0.5
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype("<i2").tobytes())
print("wrote", out, dur, "s")
