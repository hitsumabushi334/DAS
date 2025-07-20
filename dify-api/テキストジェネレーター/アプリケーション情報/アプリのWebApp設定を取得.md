# アプリのWebApp設定を取得

## OpenAPI

````yaml ja-jp/openapi_completion.json get /site
paths:
  path: /site
  method: get
  servers:
    - url: '{api_base_url}'
      description: API のベースURL。 {api_base_url} をアプリケーション提供の実際の API ベースURLに置き換えてください。
      variables:
        api_base_url:
          type: string
          description: 実際の API ベースURL
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
                API-Key認証。すべてのAPIリクエストで、`Authorization` HTTPヘッダーに `Bearer
                {API_KEY}` の形式でAPIキーを含めてください。APIキーの漏洩を避けるため、サーバーサイドでの保存を強く推奨します。
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
                    description: チャットの色テーマ（16進数）。
              chat_color_theme_inverted:
                allOf:
                  - type: boolean
                    description: テーマ反転。
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
                    description: アイコン（emojiまたは画像URL）。
              icon_background:
                allOf:
                  - type: string
                    description: 背景色（16進数）。
              icon_url:
                allOf:
                  - type: string
                    format: url
                    nullable: true
                    description: アイコンURL。
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
                    description: プライバシーポリシーリンク。
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
                    description: ワークフロー詳細表示。
              use_icon_as_answer_icon:
                allOf:
                  - type: boolean
                    description: WebAppアイコンを返信アイコンとして使用。
            description: アプリケーションのWebApp設定。
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
        description: WebApp設定。
  deprecated: false
  type: path
components:
  schemas: {}

````