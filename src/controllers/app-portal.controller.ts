import { AppPortalService } from '../services/mod.ts';
import { Controller, inject, Replier, Subscriber } from '@his/base/controller-base/mod.ts';
import { JsMsg, JSONCodec, Msg } from 'https://deno.land/x/nats@v1.17.0/src/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { nanoid } from 'npm:nanoid';
import { Coding } from '@his-base/datatypes';
import { AppNews } from '@his-viewmodel/appPortal';

@Controller('appPortal')
export class AppPortalController {
  
  mongoDB = inject(MongoBaseService);
  #appPortalService = inject(AppPortalService);
  #codec = JSONCodec<any>();

  /** 取得最新消息清單
   *  自db拿到最新消息清單後回傳
   */
  @Replier('appNews.find')
  async getAppNewsList(message: Msg, payload: string) {
    
    const appNews = await this.#appPortalService.getAppNewsList(payload);
    message.respond(this.#codec.encode(appNews));
  }

  /** 新增最新消息
   *  新增最新消息後，將最新消息發送給相關使用者
   */
  @Subscriber('appNews.add')
  async pubUserNews(message: JsMsg, payload: any) {

    try {
     
      const _id = nanoid();
      const tmpNews = {
        '_id': _id,
        'appStore_ids': payload.appStore_ids,
        'level': payload.level,
        'title': payload.title,
        'url': payload.url,
        'sendUser': payload.sendUser,
        'sendTime': new Date(payload.sendTime),
        'expiredTime': new Date(payload.expiredTime),
        'updatedBy': payload.updatedBy,
        'updatedAt': new Date(payload.updatedAt),
      };

      let userIds: any = [];
      if (tmpNews.appStore_ids.length > 1) {

        const ids: object[] = [];
        const appStoreFilter = { $or: ids };
        tmpNews.appStore_ids.forEach((x: string) => {
          ids.push({ 'appStore_id': x });
        });
        userIds = await this.#appPortalService.getUserIds(appStoreFilter);
      } else if (tmpNews.appStore_ids.length === 1) {
        
        const appStoreFilter = { 'appStore_id': tmpNews.appStore_ids[0] };
        userIds = await this.#appPortalService.getUserIds(appStoreFilter);
      } else userIds = await this.#appPortalService.getUserIds({});
      
      await this.#appPortalService.insertAppNews(tmpNews);
      userIds.forEach(async (user: Coding) => {
        const payload = {
          appNews_id: tmpNews._id,
          user: user,
          readTime: new Date('2999-12-31T23:59:59.000Z'),
        };
        await this.#appPortalService.pubUserNews(user, payload);
      });
      message.ack();
    } catch (error) {
      
      console.error('Error processing news.appNews.add: ', error);
      message.nak();
    }
  }

  /** 新增使用者最新消息
   *  insertUserNews
   */
  @Subscriber('userNews.>')
  async insertUserNews(message: JsMsg, payload: any) {
    
    try {

      const userNews_id = nanoid();
      const tmpNews = {
        '_id': userNews_id,
        'appNews_id': payload.appNews_id,
        'user': payload.user,
        'readTime': new Date(payload.readTime),
        'updatedBy': payload.user,
        'updatedAt': new Date(),
      };
      await this.#appPortalService.insertUserNews(tmpNews);
      message.ack();
    } catch (error) {

      console.error('Error processing insertUserNews: ', error);
      message.nak();
    }
  }

  /** 取得新增的最新消息內容
   *  取得newsContent
   */
  @Replier('news.newsContent')
  async getMyAppNews(message: Msg, payload: any) {

    const pipeline = [
      /** 第一階段：篩選符合條件的 AppNews 數據 */
      {
        $match: {
          '_id': payload,
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
    const myAppNews = await this.#appPortalService.getMyAppNews(pipeline);
    if (myAppNews) {

      message.respond(this.#codec.encode(myAppNews));
    }
  }

  /** 修改最新消息
   *  以修改updatedAt的方式修改最新消息
   */
  @Subscriber('appNews.modify')
  async modifyAppNews(message: JsMsg, payload: AppNews) {

    try {

      const nowDate = new Date();
      const tmpNews = {
        '_id': payload._id,
        'appStore_ids': payload.appStore_ids,
        'level': payload.level,
        'title': payload.title,
        'url': payload.url,
        'sendUser': payload.sendUser,
        'sendTime': new Date(payload.sendTime),
        'expiredTime': new Date(payload.expiredTime),
        'updatedBy': payload.updatedBy,
        'updatedAt': nowDate,
      };
      await this.#appPortalService.modiftAppNews(tmpNews);
      message.ack();
    } catch (error) {

      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  /** 刪除最新消息
   *  以更新expiredTime處理
   */
  @Subscriber('appNews.delete')
  async removeAppNews(message: JsMsg, payload: string) {

    try {

      await this.#appPortalService.removeAppNews(payload);
      message.ack();
    } catch (error) {

      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  /** 取得AppStore清單
   *  自db拿到AppStore清單後回傳
   */
  @Replier('appStore.find')
  async getAppStores(message: Msg, payload: any) {

    const appStores = await this.#appPortalService.getAppStores();
    message.respond(this.#codec.encode(appStores));
  }
}
