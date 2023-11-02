export class AppPortalService {
  async insertAppPortal() {
    await new Promise(() => {
      setTimeout(() => {
        console.log('insertAppPortal Done!');
      }, 2000);
    });
  }

  async getAppPortals() {
    return await new Promise((resolve) => {
      setTimeout(() => {
        console.log('getAppPortals Done!');
        resolve('getAppPortals');
      }, 2000);
    });
  }
}
