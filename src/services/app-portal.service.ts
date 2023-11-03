import { inject } from '@his/base/controller-base/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { JetStreamService } from '@his/base/jetstream/mod.ts';
import { Coding } from '@his-base/datatypes';
import { AppNews, UserNews} from '@his-viewmodel/appPortal';

export class AppPortalService {
  
  mongoDB = inject(MongoBaseService);
  jetStreamService = inject(JetStreamService);

  /** 取得最新消息清單
   *  使用find()拿到最新消息清單後回傳
   */
  async getAppNewsList(user: string) {

    await using db = await this.mongoDB.connect();
    return await db.collection('AppNews').find({ 'sendUser.code': user }).toArray();
  }

  /** 取得AppStore清單
   *  使用find()拿到AppStore清單後回傳
   */
  async getAppStores() {

    await using db = await this.mongoDB.connect();
    return await db.collection('AppStore').find().toArray();
  }

  /** 取得選定的appStore中所有使用者id
   *  使用distinct()過濾重複的使用者id後回傳
   */
  async getUserIds(appStoreFilter: object) {

    await using db = await this.mongoDB.connect();
    return await db.collection('UserAppStore').distinct('user', appStoreFilter);
  }

  /** 新增最新消息到資料庫
   *  使用insertOne()將appNews存入資料庫
   */
  async insertAppNews(appNews: AppNews) {

    await using db = await this.mongoDB.connect();
    await db.collection('AppNews').insertOne(appNews);
  }

  /** 發送userNews資訊到nats
   *  publish userNews
   */
  async pubUserNews(user: Coding, payload: object) {

    await this.jetStreamService.publish(
      `appPortal.appPortal.userNews.${user.code}`,
      payload,
    );
  }

  /** 接收userNews並存入資料庫
   *  使用insertOne()將userNews存入資料庫
   */
  async insertUserNews(userNews: UserNews) {

    await using db = await this.mongoDB.connect();
    await db.collection('UserNews').insertOne(userNews);
  }

  /** 取得新增的最新消息內容
   *  使用aggregate()取得新增的最新消息內容
   */
  async getMyAppNews(pipeline: Object[]) {

    await using db = await this.mongoDB.connect();
    return await db.collection('AppNews').aggregate(pipeline).toArray();
  }

  /** 修改最新消息
   *  以修改updatedAt的方式修改最新消息
   */
  async modiftAppNews(appNews: AppNews) {

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

  /** 刪除最新消息
   *  以更新expiredTime處理
   */
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
