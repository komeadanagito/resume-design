import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ArtifactStore } from "../src/artifacts/store.js";

async function makeStore() {
  const dir = await mkdtemp(join(tmpdir(), "rs-art-"));
  return { store: new ArtifactStore(dir), dir };
}

describe("ArtifactStore", () => {
  it("saves an artifact and lists it with version 1", async () => {
    const { store } = await makeStore();
    const saved = await store.save("proj_1", {
      identifier: "resume-v1",
      type: "text/html",
      title: "Resume",
      content: "<html><body>hi</body></html>"
    });

    expect(saved.tabId).toBe("resume-v1");
    expect(saved.title).toBe("Resume");

    const all = await store.list("proj_1");
    expect(all).toHaveLength(1);
    expect(all[0].content).toContain("hi");
  });

  it("bumps version for repeated identifiers and keeps latest in list", async () => {
    const { store } = await makeStore();
    await store.save("proj_1", { identifier: "r", type: "text/html", title: "v1", content: "<p>1</p>" });
    const second = await store.save("proj_1", { identifier: "r", type: "text/html", title: "v2", content: "<p>2</p>" });

    expect(second.id).not.toBe("");
    const all = await store.list("proj_1");
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("v2");
    expect(all[0].content).toContain("2");
  });

  it("writes the html file into the project workspace", async () => {
    const { store, dir } = await makeStore();
    await store.save("proj_1", { identifier: "resume", type: "text/html", title: "R", content: "<p>x</p>" });
    const onDisk = await readFile(join(dir, "projects", "proj_1", "resume.html"), "utf8");
    expect(onDisk).toContain("<p>x</p>");
  });

  it("isolates projects", async () => {
    const { store } = await makeStore();
    await store.save("proj_a", { identifier: "r", type: "text/html", title: "A", content: "a" });
    expect(await store.list("proj_b")).toEqual([]);
  });
});
