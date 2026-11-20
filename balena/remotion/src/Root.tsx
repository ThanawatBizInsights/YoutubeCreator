import { Composition } from "remotion";
import { BalenaEP03 } from "./BalenaEP03";

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
    </>
  );
};
