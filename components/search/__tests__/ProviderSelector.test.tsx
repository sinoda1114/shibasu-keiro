import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProviderSelector } from '../ProviderSelector'
import { PROVIDER_CONFIGS } from '@/lib/providers/providers'
import { MantineProvider } from '@mantine/core'

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('ProviderSelector', () => {
  it('PROVIDER_CONFIGS の全プロバイダーのラベルがレンダリングされること', () => {
    renderWithMantine(
      <ProviderSelector value="nagoya_city_bus" onChange={vi.fn()} />
    )

    for (const config of PROVIDER_CONFIGS) {
      expect(screen.getByText(config.displayName)).toBeInTheDocument()
    }
  })

  it('value props が反映されて選択中のプロバイダーが表示されること', () => {
    renderWithMantine(
      <ProviderSelector value="yokohama_city_bus" onChange={vi.fn()} />
    )

    expect(screen.getByText('横浜市バス')).toBeInTheDocument()
    expect(screen.getByText('名古屋市バス')).toBeInTheDocument()
  })

  it('選択変更時に onChange が正しい providerId で呼ばれること', () => {
    const handleChange = vi.fn()

    renderWithMantine(
      <ProviderSelector value="nagoya_city_bus" onChange={handleChange} />
    )

    fireEvent.click(screen.getByText('横浜市バス'))

    expect(handleChange).toHaveBeenCalledWith('yokohama_city_bus')
  })
})
