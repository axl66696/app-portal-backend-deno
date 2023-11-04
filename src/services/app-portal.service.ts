import { inject } from '@his/base/controller-base/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { JetStreamService } from '@his/base/jetstream/mod.ts';
import { Coding } from '@his-base/datatypes';
import { AppNews, UserNews } from '@his/viewmodel/app-portal/index.js';
import { nanoid } from 'npm:nanoid'

export class AppPortalService {
  
  mongoDB = inject(MongoBaseService);
  jetStreamService = inject(JetStreamService);
  subjectBase = 'appPortal.appPortal.userNews.';


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

  async addAppNews(appNews: AppNews) {
    await using db = await this.mongoDB.connect();
    const _id = nanoid();
    appNews._id = _id; 
    
    await db.collection('AppNews').insertOne(appNews);
  }

  async getUserIds(appStore_ids) {

    await using db = await this.mongoDB.connect();
    let user_ids: any = [];
    if (appStore_ids.length > 1) {

      const ids: object[] = [];
      const appStoreFilter = { $or: ids };
      appStore_ids.forEach((x: string) => {
        ids.push({ 'appStore_id': x });
      });
      return await db.collection('UserAppStore').distinct('user', appStoreFilter);
    } else if (appStore_ids.length === 1) {
      
      const appStoreFilter = { 'appStore_id': appStore_ids[0] };
      return await db.collection('UserAppStore').distinct('user', appStoreFilter);
    } else return await db.collection('UserAppStore').distinct('user', {});
  }
  
  /** 取得選定的appStore中所有使用者id
   *  使用distinct()過濾重複的使用者id後回傳
   */
  // async gtUserIds(appStoreFilter: object) {

  //   await using db = await this.mongoDB.connect();
  //   return await db.collection('UserAppStore').distinct('user', appStoreFilter);
  // }

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
  async pubUserNews(appNews: AppNews) {

    const user_ids = await this.getUserIds(appNews.appStore_ids);
    user_ids.forEach(async (user: Coding) => {
      const payload = {
        appNews_id: appNews._id,
        user: user,
        readTime: new Date('2999-12-31T23:59:59.000Z'),
      };
      await this.jetStreamService.publish(
        `appPortal.appPortal.userNews.${user.code}`,
        payload,
      );
    });
  }

  /** 接收userNews並存入資料庫
   *  使用insertOne()將userNews存入資料庫
   */
  async insertUserNews(userNews: UserNews) {

    const userNews_id = nanoid();
      const tmpNews = {
        '_id': userNews_id,
        'appNews_id': userNews.appNews_id,
        'user': userNews.user,
        'readTime': new Date(userNews.readTime),
        'updatedBy': userNews.user,
        'updatedAt': new Date(),
      };
    
    await using db = await this.mongoDB.connect();
    await db.collection('UserNews').insertOne(userNews);
  }

  /** 取得新增的最新消息內容
   *  使用aggregate()取得新增的最新消息內容
   */
  async getMyAppNews(_id) {

    const pipeline = [
      /** 第一階段：篩選符合條件的 AppNews 數據 */
      {
        $match: {
          '_id': _id,
        },
      },
      /** 第二階段
       * 從 AppNews 集合中關聯 UserNews 數據
       */
      {
        $lookup: {
          from: 'UserNews', // 關聯的collection名稱
          localField: '_id', // AppNews 集合中的字段，用於關聯
          foreignField: 'appNews_id', // UserNews 集合中的字段，用於關聯
          as: 'userNewsData', // 輸出字段的别名
        },
      },
      /** 第三階段：將相關數據進行重構，生成合併後的文檔 */
      {
        $unwind: {
          path: '$userNewsData',
          preserveNullAndEmptyArrays: true,
        },
      },
      /** 第四階段：輸出所需的欄位 */
      {
        $project: {
          code: '$userNewsData.code',
          appNews_id: '$userNewsData._id',
          appStore_id: 1,
          level: 1,
          url: 1,
          title: 1,
          sendUser: 1,
          sendTime: 1,
          expiredTime: 1,
          readTime: '$userNewsData.readTime',
        },
      },
    ];

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
