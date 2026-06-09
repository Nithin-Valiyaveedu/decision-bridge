import { Composition } from "remotion";
import { HowItWorks } from "./HowItWorks";

export const Root: React.FC = () => (
  <Composition
    id="HowItWorks"
    component={HowItWorks}
    durationInFrames={960}
    fps={30}
    width={1280}
    height={720}
  />
);
