const menuItemId = "yandex-img-search";
let zone = "com";

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== menuItemId) return;
  let url;

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });

  if (info.srcUrl.startsWith("http")) {
    url = getResultUrl(info.srcUrl);
  } else if (info.srcUrl.startsWith("data:image/")) {
    // Duplicated code
    const b64 = atob(info.srcUrl.split(";base64,")[1]);
    await fetch("https://yandex.ru/images-apphost/image-download", {
      headers: {
        accept: "*/*",
        "content-type": "image/jpeg",
      },
      body: Uint8Array.from(b64, (c) => c.charCodeAt(0)),
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res;
      })
      .then((r) => r.json())
      .then((r) => {
        url = getResultUrl(r?.url);
      })
      .catch((e) => {
        console.warn(e);
        url = getResultUrl(info.srcUrl);
      });
    // end of duplicated code
  } else {
    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: findImage,
        args: [info.srcUrl],
      })
      .then((v) => v[0]?.result)
      .then((response) => (url = getResultUrl(response?.url)))
      .catch(() => {
        if (info.srcUrl.startsWith("file")) {
          url = chrome.runtime.getURL("no-file-access.html");
        } else {
          url = getResultUrl(info.srcUrl);
        }
      });
  }

  if (url) await chrome.tabs.create({ url, index: tab.index + 1 });
});

chrome.runtime.onInstalled.addListener(() => {
  zone = chrome.i18n.getUILanguage() === "ru" ? "ru" : "com";
  chrome.contextMenus.create({
    title: chrome.i18n.getMessage("findImage"),
    id: menuItemId,
    contexts: ["image"],
  });
});

function getResultUrl(url) {
  const zone = chrome.i18n.getUILanguage() === "ru" ? "ru" : "com";
  const img = encodeURIComponent(url);
  return `https://yandex.${zone}/images/search?rpt=imageview&url=${img}`;
}

function findImage(url) {
  const getTargetSize = (image) => {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const limit = 512;
    const scale = limit / Math.max(width, height);

    return {
      width: scale < 1 ? width * scale : width,
      height: scale < 1 ? height * scale : height,
    };
  };

  const imageToUint8Array = (image) => {
    const canvas = document.createElement("canvas");
    const sizes = getTargetSize(image);
    canvas.width = sizes.width;
    canvas.height = sizes.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, sizes.width, sizes.height);
    const b64 = canvas.toDataURL("image/jpeg", 0.7).split(";base64,")[1];
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  };

  const fetchYa = (body) => {
    return fetch("https://yandex.ru/images-apphost/image-download", {
      headers: {
        accept: "*/*",
        "content-type": "image/jpeg",
      },
      body,
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res;
      })
      .then((r) => r.json());
  };

  try {
    const img = document.querySelector(`[src="${url}"]`);
    return fetchYa(imageToUint8Array(img));
  } catch (e) {
    return Promise.reject(e);
  }
}
