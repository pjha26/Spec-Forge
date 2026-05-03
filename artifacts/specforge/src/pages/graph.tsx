import { DependencyGraph } from "@/components/dependency-graph";

export default function GraphPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DependencyGraph />
    </div>
  );
}
