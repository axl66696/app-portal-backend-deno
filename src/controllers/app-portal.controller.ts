import { AppPortalService } from '../services/mod.ts';
import { Controller, inject, Replier, Subscriber } from '@his/base/controller-base/mod.ts';
import { JSONCodec, JsMsg, Msg } from 'https://deno.land/x/nats@v1.17.0/src/mod.ts';

@Controller('appPortal')
export class AppPortalController {
  #appPortalService = inject(AppPortalService);
  #codec = JSONCodec<T>();

  @Subscriber('insert')
  async insertAppPortal(message: JsMsg, payload: T) {
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
  async getAppPortals(message: Msg, payload: T) {
    try {
      console.log('Processing getAppPortals: ', payload);
      const appPortals = await this.#appPortalService.getAppPortals();

      message.respond(this.#codec.encode(appPortals));
    } catch (error) {
      console.error('Error while getAppPortals: ', error);
    }
  }
}
