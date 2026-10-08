function encodeUrl(str){
  if (!str) return str;
  return encodeURIComponent(str.toString().split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char).join(''));
}

async function openUV(url){
  /*var uv = document.createElement("iframe");
  var wlh = window.location.hostname;
  uv.src = "https://u." + (wlh.startsWith("www") ? wlh.substring(4) : wlh) + "?open=" + encodeUrl(url);
  uv.style.display = "none";
  document.body.appendChild(uv);*/
  try {
    await UtopiaProxy.navigate(url);
  } catch (error) {
    UtopiaProxy.showError(error);
  }
}
