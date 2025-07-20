# アプリのWebApp設定を取得 (ワークフロー)

## OpenAPI

````yaml ja-jp/openapi_workflow.json get /site
paths:
  path: /site
  method: get
  servers:
    - url: '{api_base_url}'
      description: APIのベースURL。{api_base_url}を実際のAPIベースURLに置き換えてください。
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
                API-Key認証。すべてのAPIリクエストにおいて、Authorization
                HTTPヘッダーにAPIキーを含めてください（例：Bearer
                {API_KEY}）。APIキーの漏洩を防ぐため、サーバー側で保存することを強くお勧めします。
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
                    description: アイコン内容 (emojiまたは画像URL)。
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
            description: ワークフローアプリのWebApp設定。
            refIdentifier: '#/components/schemas/WorkflowWebAppSettingsResponseJp'
        examples:
          example:
            value:
              title: <string>
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
        description: WebApp設定情報。
  deprecated: false
  type: path
components:
  schemas: {}

````