# Deno Model

後端 Model 的範例，用於創建處理商業邏輯的 Model

- [生成專案](#生成專案)
- [檢查並更新依賴模組](#檢查並更新依賴模組)
- [設定 Model](#設定-model)
- [Import 注意事項](#import-注意事項)

## 生成專案

### CLI

```bash
hgm new order
cd order
```

## 檢查並更新依賴模組

每次上傳 (push) 前都請務必跑一次，確保依賴關係是正確的

```bash
deno task check
```

## 設定 Model

### 建立 Controller/Service Class

請直接使用 CLI

```bash
hgm c order
hgm s order
```

### Controller 裝飾器

引入 [controller-base](https://gitlab.aservice.com.tw/hpc-his/base/controller-base) 專案並使用其中的 Controller、Subscriber、Replier 裝飾器<br>

- Controller 應使用 Controller 裝飾器
- 單純監聽的函式應使用 Subscriber 裝飾器，並將會帶入的參數定義好
- 需要回傳資料的函式應使用 Replier 裝飾器，並將會帶入的參數定義好

```ts
import { Controller, Subscriber, Replier } from '@his/base/controller-base/mod.ts';
import { JsMsg, Msg, JSONCodec } from 'https://deno.land/x/nats@v1.17.0/src/mod.ts'; // 引入 NATS 訊息的相關型別

@Controller('order') // 帶入subject大主題
export class OrderController {
  #codec = JSONCodec<T>();

  @Subscriber('insert') // 帶入大主題底下的小主題
  // 設定會帶入的參數，Subscriber 的參數會有 message (完整的 NATS JetStream 訊息物件) 和 payload (解碼後的資料本體)
  async insertOrder(message: JsMsg, payload: T) {
    try {
      // 處理訊息...

      // 處理完成回傳ack
      message.ack();
    } catch (error) {
      // 發生錯誤，印出錯誤訊息並回傳nak
      console.error('Error while inserOrder: ', error);
      message.nak();
    }
  }

  @Replier('list') // 帶入大主題底下的小主題
  // 設定會帶入的參數，Replier的參數會有一個message (完整的Core NATS訊息物件) 和 payload (解碼後的資料本體)
  async getOrders(message: Msg, payload: T) {
    // 處理需要回傳的資料
    const orders = [
      /* ... */
    ];

    // 將資料編碼並回傳
    message.respond(this.codec.encode(orders));
  }
}
```

### 引入其他 Service

#### 單實例 (Controller、Service 皆可使用)

```ts
import { inject } from '@his/base/controller-base/mod.ts';
import { MongoBaseService } from '@his/base/mongo-base/mod.ts';

export class OrderService {
  #mongoService = inject(MongoBaseService);

  // ...
}
```
