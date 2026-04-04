export function ensureMountNode(id) {
  let mountNode = document.getElementById(id);

  if (mountNode) {
    return mountNode;
  }

  document.body.innerHTML = "";
  mountNode = document.createElement("div");
  mountNode.id = id;
  document.body.appendChild(mountNode);
  return mountNode;
}
