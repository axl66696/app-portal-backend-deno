import { inject } from '@his/base/controller-base/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { JetStreamService } from '@his/base/jetstream/mod.ts';
import { Coding } from '@his-base/datatypes';
// import { AppNews} from '@his-viewmodel/appPortal';

export class AppPortalService {
  mongoDB = inject(MongoBaseService);
  jetStreamService = inject(JetStreamService);

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

  async getUserIds(appStoreFilter: object) {
    await using db = await this.mongoDB.connect();
    return await db.collection('UserAppStore').distinct('user', appStoreFilter);
  }

  async getAppNewsList(user: string) {
    await using db = await this.mongoDB.connect();
    return await db.collection('AppNews').find({ 'sendUser.code': user })
      .toArray();
  }

  async getAppStores() {
    await using db = await this.mongoDB.connect();
    return await db.collection('AppStore').find().toArray();
  }

  

  async insertAppNews(appNews: unknown) {
    await using db = await this.mongoDB.connect();
    await db.collection('AppNews').insertOne(appNews);
  }

  async pubUserNews(user: Coding, payload: object) {
    await this.jetStreamService.publish(
      `appPortal.appPortal.userNews.${user.code}`,
      payload,
    );
  }

  async insertUserNews(userNews: unknown) {
    await using db = await this.mongoDB.connect();
    await db.collection('UserNews').insertOne(userNews);
  }

  async getMyAppNews(pipeline: Object[]) {
    await using db = await this.mongoDB.connect();
    return await db.collection('AppNews').aggregate(pipeline).toArray();
  }

  async modiftAppNews(appNews: any) {
    await using db = await this.mongoDB.connect();
    await db.collection('AppNews').updateOne(
      { _id: appNews._id },
      {
        $set: {
          'appStore_ids': appNews.appStore_ids,
          'level': appNews.level,
          'title': appNews.title,
          'url': appNews.url,
          'sendUser': appNews.sendUser,
          'sendTime': new Date(appNews.sendTime),
          'expiredTime': new Date(appNews.expiredTime),
          'updatedBy': appNews.updatedBy,
          'updatedAt': appNews.updatedAt,
        },
      },
    );
  }

  async removeAppNews(_id: string) {
    await using db = await this.mongoDB.connect();
    await db.collection('AppNews')
      .updateOne(
        { '_id': _id },
        {
          $set: { 'expiredTime': new Date() },
        },
      );
  }
}
