import React from "react";
import RealTimeAudioGraph from "./RealTimeAudioGraph";

interface WorkspaceFooterProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying: boolean;
  graphEnabled: boolean;
}

const WorkspaceFooter: React.FC<WorkspaceFooterProps> = ({
  analyserRef,
  isPlaying,
  graphEnabled,
}) => {
  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-2 overflow-hidden">
      <RealTimeAudioGraph
        analyserRef={analyserRef}
        isPlaying={isPlaying}
        graphEnabled={graphEnabled}
      />
    </div>
  );
};

export default WorkspaceFooter;
