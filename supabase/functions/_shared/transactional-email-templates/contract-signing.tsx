import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CommandPet"

interface ContractSigningProps {
  clienteName?: string
  contractTitle?: string
  signingLink?: string
  petName?: string
  serviceType?: string
}

const ContractSigningEmail = ({ clienteName, contractTitle, signingLink, petName, serviceType }: ContractSigningProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Contrato para assinatura digital — {contractTitle || 'CommandPet'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>📋 Contrato para Assinatura</Heading>
        </Section>

        <Text style={text}>
          Olá{clienteName ? `, ${clienteName}` : ''}!
        </Text>

        <Text style={text}>
          Segue o contrato <strong>{contractTitle || 'de prestação de serviço'}</strong>
          {petName ? ` referente ao pet ${petName}` : ''}
          {serviceType ? ` (${serviceType})` : ''} para sua assinatura digital.
        </Text>

        <Text style={text}>
          Por favor, clique no botão abaixo para revisar e assinar o contrato:
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={signingLink || '#'}>
            Assinar Contrato
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={smallText}>
          Este link é válido por 7 dias. Caso tenha dúvidas, entre em contato conosco.
        </Text>

        <Text style={footer}>
          Atenciosamente, Equipe {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContractSigningEmail,
  subject: (data: Record<string, any>) => `Contrato para assinatura — ${data.contractTitle || 'CommandPet'}`,
  displayName: 'Contrato para assinatura',
  previewData: {
    clienteName: 'Maria Silva',
    contractTitle: 'Contrato de Hospedagem — Rex',
    signingLink: 'https://commandpetsistem.lovable.app/assinar/abc123',
    petName: 'Rex',
    serviceType: 'Hotel',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { backgroundColor: '#2563EB', borderRadius: '10px 10px 0 0', padding: '24px', marginBottom: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2563EB',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const smallText = { fontSize: '13px', color: '#888888', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0' }
