# アプリのWebApp設定を取得

> アプリのWebApp設定を取得するために使用します。

## OpenAPI

````yaml ja-jp/openapi_chatflow.json get /site
paths:
  path: /site
  method: get
  servers:
    - url: '{api_base_url}'
      description: APIのベースURL。 {api_base_url} をアプリケーション提供の実際のAPIベースURLに置き換えてください。
      variables:
        api_base_url:
          type: string
          description: 実際のAPIベースURL
          default: https://api.dify.ai/v1
  request:
    security:
      - title: ApiKeyAuth
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
              description: >-
                APIキー認証。すべてのAPIリクエストには、Authorization HTTPヘッダーにAPIキーを `Bearer
                {API_KEY}`
                の形式で含めてください。APIキーはサーバー側に保存し、クライアント側で共有または保存しないことを強くお勧めします。
          cookie: {}
    parameters:
      path: {}
      query: {}
      header: {}
      cookie: {}
    body: {}
  response:
    '200':
      application/json:
        schemaArray:
          - type: object
            properties:
              title:
                allOf:
                  - type: string
                    description: WebApp名。
              chat_color_theme:
                allOf:
                  - type: string
                    description: チャットの色テーマ、16進数形式。
              chat_color_theme_inverted:
                allOf:
                  - type: boolean
                    description: チャットの色テーマを反転するかどうか。
              icon_type:
                allOf:
                  - type: string
                    enum:
                      - emoji
                      - image
                    description: アイコンタイプ。
              icon:
                allOf:
                  - type: string
                    description: アイコン。`emoji`タイプの場合は絵文字、`image`タイプの場合は画像URL。
              icon_background:
                allOf:
                  - type: string
                    description: 16進数形式の背景色。
              icon_url:
                allOf:
                  - type: string
                    format: url
                    nullable: true
                    description: アイコンのURL。
              description:
                allOf:
                  - type: string
                    description: 説明。
              copyright:
                allOf:
                  - type: string
                    description: 著作権情報。
              privacy_policy:
                allOf:
                  - type: string
                    description: プライバシーポリシーのリンク。
              custom_disclaimer:
                allOf:
                  - type: string
                    description: カスタム免責事項。
              default_language:
                allOf:
                  - type: string
                    description: デフォルト言語。
              show_workflow_steps:
                allOf:
                  - type: boolean
                    description: ワークフローの詳細を表示するかどうか。
              use_icon_as_answer_icon:
                allOf:
                  - type: boolean
                    description: WebAppのアイコンをチャット内のロボットアイコンに置き換えるかどうか。
            description: アプリのWebApp設定。
            refIdentifier: '#/components/schemas/WebAppSettingsResponseJp'
        examples:
          example:
            value:
              title: <string>
              chat_color_theme: <string>
              chat_color_theme_inverted: true
              icon_type: emoji
              icon: <string>
              icon_background: <string>
              icon_url: <string>
              description: <string>
              copyright: <string>
              privacy_policy: <string>
              custom_disclaimer: <string>
              default_language: <string>
              show_workflow_steps: true
              use_icon_as_answer_icon: true
        description: WebAppの設定情報。
  deprecated: false
  type: path
components:
  schemas: {}

````