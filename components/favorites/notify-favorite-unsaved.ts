import { notifications } from '@mantine/notifications'

// localStorage が遮断・容量超過のとき。見た目だけ変えると保存されたと誤解させるので、変えずに知らせる
export function notifyFavoriteUnsaved(): void {
  notifications.show({
    id: 'favorite-unsaved',
    color: 'red',
    message: 'この環境ではお気に入りを保存できません。ブラウザの設定でサイトデータの保存が無効になっている可能性があります。',
  })
}
