function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function formatModuleLabel(value: string) {
  const cleaned = collapseWhitespace(
    value
      .replace(/^day\s*\d+\s*[-:|,.]?\s*/i, "")
      .replace(/^day[_\s-]*\d+\s*/i, "")
  );

  return cleaned || value;
}

export function formatTopicLabel(value: string) {
  const cleaned = collapseWhitespace(
    value
      .replace(/^day\s*\d+\s*[-:|,.]?\s*/i, "")
      .replace(/^day[_\s-]*\d+\s*/i, "")
      .replace(/\bartigo\s+base\b\s*[-:|,.]?\s*/i, "")
  );

  return cleaned || value;
}
