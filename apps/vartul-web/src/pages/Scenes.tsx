import { useState } from "react";
import { useApi } from "../lib/api";
import { Alert, Button, Card, Loading, PageHead, useToast } from "../components/ui";
import { openScene, type SceneView } from "../components/Presenter";

export default function Scenes() {
  const { data } = useApi<{ current: string; scenes: SceneView[] }>("/api/scenes");
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return <Loading />;
  const start = async (s: SceneView) => {
    setBusy(s.id);
    try {
      await openScene(s);
    } catch (e) {
      toast.show({ title: "Could not load the scene", body: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="page">
      <PageHead
        role="public"
        eyebrow="Demonstration"
        title="Eleven scenes, each reproducible"
        lead="Each scene starts from a saved ledger snapshot. Steps run live through the same contracts, services and network messages as the rest of the product, so a scene can be replayed exactly. Open the presenter panel to run steps beside each view."
      />
      <Alert tone="info" title="Presenting">
        Use the Presenter button in the top bar. It shows the narrative, the live steps and what to point out, and moves between scenes. Loading a scene restores its snapshot in about three seconds.
      </Alert>
      <div className="grid g2">
        {data.scenes.map((s) => (
          <Card key={s.id} title={`${s.number}. ${s.title}`} sub={s.question} actions={<Button size="sm" variant={s.id === data.current ? "primary" : "secondary"} loading={busy === s.id} disabled={!!busy} onClick={() => start(s)}>{s.id === data.current ? "Restart" : "Start scene"}</Button>}>
            <p className="small">{s.narrative}</p>
            {s.steps.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>{s.steps.length} live step{s.steps.length > 1 ? "s" : ""}: {s.steps.map((st) => st.label).join(" · ")}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
