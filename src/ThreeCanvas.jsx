import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { initScene, datasets, okabeIto } from "./three-demo.js";

/**
 * Mounts the Three.js scene inside whatever DOM div React gives us.
 *
 * Props
 *   selectedIndex  – currently active dataset (0-5)
 *   onStats        – callback(statsString) for regression info
 *
 * Ref-API (via forwardRef)
 *   .selectDataset(i)  – programmatically animate to face i
 */
const ThreeCanvas = forwardRef(function ThreeCanvas(
  { selectedIndex = 0, onStats },
  ref,
) {
  const containerRef = useRef(null);
  const labelsRef = useRef(null);
  const sceneRef = useRef(null);

  // Expose imperative handle so parent can trigger camera moves
  useImperativeHandle(ref, () => ({
    selectDataset: (i) => sceneRef.current?.selectDataset(i),
  }));

  // Boot Three.js once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const api = initScene({
      container: containerRef.current,
      labelsContainer: labelsRef.current,
      onStats,
    });
    sceneRef.current = api;
    return () => api.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to selectedIndex prop changes
  useEffect(() => {
    sceneRef.current?.selectDataset(selectedIndex);
  }, [selectedIndex]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Three.js mounts its canvas here */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {/* HTML axis labels float over the canvas */}
      <div
        ref={labelsRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
    </div>
  );
});

export { datasets, okabeIto };
export default ThreeCanvas;
