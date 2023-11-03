import { inject } from '@his/base/controller-base/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { JetStreamService } from '@his/base/jetstream/mod.ts';
import { Coding } from '@his-base/datatypes';

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

    async getAppNewsList(user: string) {
        await using db = await this.mongoDB.connect();
        return await db.collection('AppNews').find({ 'sendUser.code': user }).toArray();
    }

    async getAppStores() {
        await using db = await this.mongoDB.connect();
        return await db.collection('AppStore').find().toArray();
    }

    async getUserIds(appStoreFilter: any) {
        await using db = await this.mongoDB.connect();
        return await db.collection('UserAppStore').distinct('user', appStoreFilter);
    }

    async insertAppNews(appNews: any) {
        await using db = await this.mongoDB.connect();
        await db.collection('AppNews').insertOne(appNews);
    }

    async pubUserNews(user: Coding, payload: any) {
        await this.jetStreamService.publish(`appPortal.appPortal.userNews.${user.code}`, payload)
    }

    async insertUserNews(userNews: any) {
        await using db = await this.mongoDB.connect();
        await db.collection('UserNews').insertOne(userNews);
    }

    async getMyAppNews(pipeline: any) {
        await using db = await this.mongoDB.connect();
        return await db.collection('AppNews').aggregate(pipeline).toArray();
    }

    async modiftAppNews(userNews: any) {
        await using db = await this.mongoDB.connect();
        await db.collection('AppNews').updateOne(
            { _id: userNews._id },
            { 
                $set: {
                    'appStore_ids': userNews.appStore_ids,
                    'level': userNews.level,
                    'title': userNews.title,
                    'url': userNews.url,
                    'sendUser': userNews.sendUser,
                    'sendTime': new Date(userNews.sendTime),
                    'expiredTime': new Date(userNews.expiredTime),
                    'updatedBy': userNews.updatedBy,
                    'updatedAt': userNews.updatedAt,
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
                        $set:{ 'expiredTime':new Date() },
                    },
                );
    }
}
