const handler = () => {

  const socket = io({ transports: ["websocket"] });

  //copy-paste token here.  Usually ir is stored in LocalStorage
  const jwt = "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjViZmIzMzYxOTVkMWY5MDVmY2E1MmYxYyIsImRpc3BsYXlOYW1lIjoiU2xhdmEiLCJlbWFpbCI6InNsYXZhQG1haWwucnUiLCJpYXQiOjE1NDMxOTA1Njl9.Ad0HitDL9qJR39mjq0RWn1ENteL7mMYN7hcT7tKp1uA"

  socket.on('connect', function () {
    socket.emit("clientEvent", "Я еще не отослал свой токен");
    socket
    .emit('authenticate', {token: jwt})
    .on('authenticated', function () {
      socket.emit("clientEvent", "Я отослал свой токен и прошел авторизацию");
    })
    .on('unauthorized', function(msg) {
      console.log("unauthorized: " + JSON.stringify(msg.data));
      throw new Error(msg.data.type);
    })
  });


};

document.addEventListener("DOMContentLoaded", handler);
