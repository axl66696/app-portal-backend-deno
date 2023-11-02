import { AppPortalService } from '../services/mod.ts';
import { Controller, inject, Replier, Subscriber } from '@his/base/controller-base/mod.ts';
import { JSONCodec, JsMsg, Msg } from 'https://deno.land/x/nats@v1.17.0/src/mod.ts';
// import { OrderService } from '@his/model/order-service/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';
// import { T } from '@his/base/types/mod.ts';

@Controller('appPortal')
export class AppPortalController {
  #appPortalService = inject(AppPortalService);
//   orderService = inject(OrderService);
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
    await using db = await this.mongoDB.connect();

    await db.collection("AppNews").find({ 'sendUser.code': payload }).toArray()
      .then((appNews:unknown) => {
        message.respond(this.#codec.encode(appNews));
      });


  }
}
