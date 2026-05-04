import * as nitron from 'nitron';

nitron.app.init({
  name: "Momentum",
  packageId: "com.eloratech.momentum",
  version: "1.0.0",
  entry: "index.html",
  orientation: "portrait",
  statusBar: true,
  permissions: ["INTERNET"]
});