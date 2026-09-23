/**
 * 相鉄バスの取り込みが使う ODPT のキーと、それを読んだ環境変数の名前。
 * ODPT_CONSUMER_KEY が無ければ YOKOHAMA_GTFS_URL の acl:consumerKey から取り出す（CI はこちら）。
 */
export function resolveOdptConsumerKey(): { key: string | undefined; envName: 'ODPT_CONSUMER_KEY' | 'YOKOHAMA_GTFS_URL' } {
  const direct = process.env.ODPT_CONSUMER_KEY
  if (direct) return { key: direct, envName: 'ODPT_CONSUMER_KEY' }
  const yokohamaUrl = process.env.YOKOHAMA_GTFS_URL
  let key: string | undefined
  if (yokohamaUrl) {
    try {
      key = new URL(yokohamaUrl).searchParams.get('acl:consumerKey') ?? undefined
    } catch {
      // URL として解釈できなければキー無しとして扱う
    }
  }
  return { key, envName: 'YOKOHAMA_GTFS_URL' }
}
