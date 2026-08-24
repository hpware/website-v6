type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function addImageAttributes(node: HastNode, firstImage: { found: boolean }) {
  if (node.type === "element" && node.tagName === "img") {
    node.properties ??= {};
    node.properties.decoding ??= "async";

    if (firstImage.found) {
      node.properties.loading ??= "lazy";
    } else {
      node.properties.loading ??= "eager";
      node.properties.fetchPriority ??= "high";
      firstImage.found = true;
    }

    const source = node.properties.src;
    const secureSource =
      typeof source === "string"
        ? source.replace("http://wp.yuanhau.com/", "https://wp.yuanhau.com/")
        : source;

    node.properties.src = secureSource;

    const dimensions =
      typeof secureSource === "string"
        ? secureSource.match(/-(\d{2,5})x(\d{2,5})\.[a-z0-9]+(?:\?.*)?$/i)
        : null;

    if (dimensions) {
      node.properties.width ??= Number(dimensions[1]);
      node.properties.height ??= Number(dimensions[2]);
    }
  }

  node.children?.forEach((child) => addImageAttributes(child, firstImage));
}

export function rehypeImageAttributes() {
  return (tree: HastNode) => addImageAttributes(tree, { found: false });
}
