const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Funções para comunicação com o processo principal podem ser adicionadas aqui
  platform: process.platform,
});
