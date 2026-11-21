import { Composition } from "remotion";
import { BalenaEP03 } from "./BalenaEP03";
import { BalenaEP04 } from "./ep04/BalenaEP04";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Balena-EP03-Final"
        component={BalenaEP03}
        durationInFrames={762}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ showCaptions: true }}
      />
      <Composition
        id="Balena-EP03-Clean"
        component={BalenaEP03}
        durationInFrames={762}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ showCaptions: false }}
      />
      <Composition
        id="Balena-EP04-Final"
        component={BalenaEP04}
        durationInFrames={1164}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ showCaptions: true }}
      />
      <Composition
        id="Balena-EP04-Clean"
        component={BalenaEP04}
        durationInFrames={1164}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ showCaptions: false }}
      />
    </>
  );
};
