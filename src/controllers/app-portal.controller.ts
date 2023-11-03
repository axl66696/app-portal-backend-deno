import { AppPortalService } from '../services/mod.ts';
import { Controller, inject, Replier, Subscriber } from '@his/base/controller-base/mod.ts';
import { JsMsg, JSONCodec, Msg } from 'https://deno.land/x/nats@v1.17.0/src/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
import { nanoid } from 'npm:nanoid';
import { Coding } from '@his-base/datatypes';

@Controller('appPortal')
export class AppPortalController {
  #appPortalService = inject(AppPortalService);
  mongoDB = inject(MongoBaseService);
  #codec = JSONCodec<any>();

  @Subscriber('insert')
  async insertAppPortal(message: JsMsg, payload: any) {
    try {
      console.log('Processing insertAppPortal: ', payload);
      await this.#appPortalService.insertAppPortal();

      message.ack();
    } catch (error) {
      console.error('Error while insertAppPortal: ', error);
      message.nak();
    }
  }

  @Replier('list')
  async getAppPortals(message: Msg, payload: any) {
    try {
      console.log('Processing getAppPortals: ', payload);
      const appPortals = await this.#appPortalService.getAppPortals();

      message.respond(this.#codec.encode(appPortals));
    } catch (error) {
      console.error('Error while getAppPortals: ', error);
    }
  }

  @Replier('appNews.find')
  async getAppNewsList(message: Msg, payload: any) {
    const appNews = await this.#appPortalService.getAppNewsList(payload);
    message.respond(this.#codec.encode(appNews));
  }

  @Subscriber('appNews.add')
  async pubUserNews(message: JsMsg, payload: any) {
    try {
      console.log('payload', payload);
      const tmpDate = new Date();
      const _id = nanoid();

      const tmp = {
        '_id': _id,
        'appStore_ids': payload.appStore_ids,
        'level':payload.level,
        'title':payload.title,
        'url': payload.url,
        'sendUser':payload.sendUser,
        'sendTime': new Date(payload.sendTime),
        'expiredTime': new Date(payload.expiredTime),
        'updatedBy': payload.updatedBy,
        'updatedAt': new Date(payload.updatedAt)
      };
      message.ack();


      let userIds: any = [];
      if (tmp.appStore_ids.length > 1) {

        console.log('>1');
        const ids: object[] = [];
        tmp.appStore_ids.forEach((x: string) => {
          ids.push({ 'appStore_id': x});
        });
        const appStoreFilter = { $or: ids };
        console.log('appStoreFilter', appStoreFilter);

        userIds = await this.#appPortalService.getUserIds(appStoreFilter);
        // await this.mongoDB.collections('UserAppStore').collection().distinct('user', appStoreFilter).then((x)=>{
        //     userIds = x;
        //   ;});
        console.log('userIds', userIds);

      } else if (tmp.appStore_ids.length === 1) {

        // console.log('=1');
        const appStoreFilter = { 'appStore_id': tmp.appStore_ids[0] };
        console.log('appStoreFilter', appStoreFilter);

        userIds = await this.#appPortalService.getUserIds(appStoreFilter);
        // await this.mongoDB.collections('UserAppStore').collection().distinct('user', appStoreFilter).then((x)=>{
        //     userIds = x;
        //   ;});
        console.log('userIds', userIds);
      } else {
        console.log('0');
        userIds = await this.#appPortalService.getUserIds({});
        // await this.mongoDB.collections('UserAppStore').collection().distinct('user', {}).then((x)=>{
        //     userIds = x;
        //   ;});
        console.log('userIds', userIds);
      }
      
      
      console.log('========>存進db的appNews', tmp);
    //   this.mongoDB.collections('AppNews').collection<StringId>().insertOne(tmp)
      await this.#appPortalService.insertAppNews(tmp);
      userIds.forEach(async (user: Coding) => {
        console.log('user', user);
        // await this.jetStreamService.publish(`appPortal.news.userNews.${user.code}`, {appNews_id:tmp._id, user:user, readTime:new Date('2999-12-31T23:59:59.000Z')})
       const payload = { appNews_id: tmp._id, user: user, readTime: new Date('2999-12-31T23:59:59.000Z') };
        await this.#appPortalService.pubUserNews(user, payload);
      });
      
      
    } catch (error) {
      console.error('Error processing news.appNews.add: ', error);
      message.nak();
    }
  }

  @Subscriber('userNews.>')
  async insertUserNews(message: JsMsg, payload: any) {
    try {
      
      console.log('payload', payload)
      const userNews_id = nanoid();

      const tmp = {
        '_id': userNews_id,
        'appNews_id': payload.appNews_id,
        'user': payload.user,
        'readTime': new Date(payload.readTime),
        'updatedBy': payload.user,
        'updatedAt': new Date(),
      };
    
      await this.#appPortalService.insertUserNews(tmp);
      message.ack();
    } catch (error) {
      console.error('Error processing insertUserNews: ', error);
      message.nak();
    }
  }

  @Replier('news.newsContent')
  async getMyAppNews(message: Msg, payload: any) {


    const pipeline = [
      /** 第一階段：篩選符合條件的 AppNews 數據 */
      {
        $match: {
          '_id': payload,
        }
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
        }
      },
      /** 第三階段：將相關數據進行重構，生成合併後的文檔 */
      {
        $unwind: {
          path: '$userNewsData',
          preserveNullAndEmptyArrays: true,
        }
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
        }
      }
    ]
    const myAppNews = await this.#appPortalService.getMyAppNews(pipeline);
    // let myAppNews = []
    // const myAppNews = await this.mongoDB.collections('AppNews').collection().aggregate(pipeline).toArray()
    console.log('===========myAppNews================', myAppNews);
    if (myAppNews) {
      message.respond(this.#codec.encode(myAppNews));
    }
  }

  @Subscriber('appNews.modify')
  async modifyAppNews(message: JsMsg, payload: any) {
    try {
      
        const tmpDate = new Date();
  
        const tmp = {
          '_id': payload._id,
          'appStore_ids': payload.appStore_ids,
          'level': payload.level,
          'title': payload.title,
          'url': payload.url,
          'sendUser': payload.sendUser,
          'sendTime': new Date(payload.sendTime),
          'expiredTime': new Date(payload.expiredTime),
          'updatedBy': payload.updatedBy,
          'updatedAt': tmpDate,
        };
        await this.#appPortalService.modiftAppNews(tmp);
        // this.mongoDB
        //   .collections('AppNews')
        //   .collection()
        //   .updateOne(
        //     { '_id': payload._id },
        //     { 
        //         $set: {
        //         'appStore_ids': payload.appStore_ids,
        //         'level':payload.level,
        //         'title':payload.title,
        //         'url': payload.url,
        //         'sendUser':payload.sendUser,
        //         'sendTime': new Date(payload.sendTime),
        //         'expiredTime': new Date(payload.expiredTime),
        //         'updatedBy': payload.updatedBy,
        //         'updatedAt': tmpDate}
        //     }
        //   );
        message.ack();
    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  
  }

  @Subscriber('appNews.delete')
  async removeAppNews(message: JsMsg, payload: any) {
    try {
        // this.mongoDB
        //   .collections('AppNews')
        //   .collection()
        //   .updateOne(
        //     { '_id': payload },
        //     {
        //         $set:{'expiredTime':new Date()}
        //     }
        //   );
        await this.#appPortalService.removeAppNews(payload);
        message.ack();
        
    
    } catch (error) {
      console.error('Error processing order.create: ', error);
      message.nak();
    }
  }

  @Replier('appStore.find')
  async getAppStores(message: Msg, payload: any) {
    console.log('getAppStores');
    const appStores = await this.#appPortalService.getAppStores();
    console.log('appStores', appStores);
    message.respond(this.#codec.encode(appStores));
    // this.mongoDB
    //   .collections('AppStore')
    //   .findDocuments({})
    //   .then((appStores) => {
    //     console.log('==============AppStore==================', appStores);
    //     message.respond(this.#codec.encode(appStores));
    //   });
  }
}
