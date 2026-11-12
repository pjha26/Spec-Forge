import { useQuery } from "@tanstack/react-query";

export function useCapabilities() {
  const { data } = useQuery({
    queryKey: ["capabilities"],
    queryFn: async () => {
      const response = await fetch("/api/capabilities");
      if (!response.ok) throw new Error("Could not load server capabilities");
      return response.json() as Promise<{ localAI: boolean; localVision: boolean; githubAutoSync: boolean; notionExport: boolean }>;
    },
    staleTime: 60_000,
  });
  return data ?? { localAI: false, localVision: false, githubAutoSync: false, notionExport: false };
}
