import { describe, expect, test } from "bun:test";
import { mergeMetadata, parseParamObj } from "../src/normalize";

describe("mergeMetadata", () => {
  test("flattens metas into root", () => {
    const b = mergeMetadata({ prompt: "x", metas: { bpm: 100 } });
    expect(b.prompt).toBe("x");
    expect(b.bpm).toBe(100);
  });

  test("does not overwrite existing root keys", () => {
    const b = mergeMetadata({ bpm: 90, metas: { bpm: 100 } });
    expect(b.bpm).toBe(90);
  });
});

describe("parseParamObj", () => {
  test("parses JSON string", () => {
    expect(parseParamObj('{"duration": 120}')).toEqual({ duration: 120 });
  });

  test("returns {} on invalid JSON", () => {
    expect(parseParamObj("not json")).toEqual({});
  });
});
