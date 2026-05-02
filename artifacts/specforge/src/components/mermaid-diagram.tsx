import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Skeleton } from "@/components/ui/skeleton";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
    });

    const renderChart = async () => {
      try {
        setError(false);
        const id = `mermaid-svg-${Math.round(Math.random() * 10000000)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error("Failed to render mermaid diagram", err);
        setError(true);
      }
    };

    if (chart) {
      renderChart();
    }
  }, [chart]);

  if (!chart) {
    return <Skeleton className="w-full h-[400px]" />;
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-destructive font-mono border border-destructive/20 bg-destructive/5 rounded-md p-4">
        Failed to render diagram.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-auto flex items-center justify-center p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
