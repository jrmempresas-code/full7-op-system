import { google } from 'googleapis'
import type { ProcessedEmail, EmailAttachment } from '@/types'

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export async function getUnprocessedOpEmails(): Promise<ProcessedEmail[]> {
  const gmail = getGmailClient()
  const subjectFilter = process.env.GMAIL_SUBJECT_FILTER ?? 'OP -'

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:"${subjectFilter}" is:unread`,
    maxResults: 20,
  })

  const messages = listRes.data.messages ?? []
  const processed: ProcessedEmail[] = []

  for (const msg of messages) {
    try {
      const email = await parseEmailMessage(gmail, msg.id!)
      processed.push(email)

      // Marcar como lido após processar
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id!,
        requestBody: { removeLabelIds: ['UNREAD'] },
      })
    } catch (err) {
      console.error(`Erro ao processar e-mail ${msg.id}:`, err)
    }
  }

  return processed
}

async function parseEmailMessage(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<ProcessedEmail> {
  const msgRes = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const payload = msgRes.data.payload!
  const headers = payload.headers ?? []

  const from    = headers.find((h) => h.name === 'From')?.value ?? ''
  const subject = headers.find((h) => h.name === 'Subject')?.value ?? ''
  const dateStr = headers.find((h) => h.name === 'Date')?.value ?? ''

  const body        = extractBody(payload)
  const attachments = await extractAttachments(gmail, messageId, payload)

  return {
    from,
    subject,
    body,
    attachments,
    receivedAt: new Date(dateStr),
  }
}

function extractBody(payload: any): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8')
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
      if (part.parts) {
        const nested = extractBody(part)
        if (nested) return nested
      }
    }
  }

  return ''
}

async function extractAttachments(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  payload: any
): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = []

  async function processPayloadPart(part: any) {
    if (part.filename && part.filename.length > 0) {
      let data: string | null = null

      if (part.body?.data) {
        data = part.body.data
      } else if (part.body?.attachmentId) {
        const attRes = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: part.body.attachmentId,
        })
        data = attRes.data.data ?? null
      }

      if (data) {
        attachments.push({
          filename:    part.filename,
          contentType: part.mimeType ?? 'application/octet-stream',
          content:     Buffer.from(data, 'base64'),
        })
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        await processPayloadPart(subPart)
      }
    }
  }

  await processPayloadPart(payload)
  return attachments
}

export async function getEmailCount(): Promise<number> {
  const gmail = getGmailClient()
  const subjectFilter = process.env.GMAIL_SUBJECT_FILTER ?? 'OP -'

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:"${subjectFilter}" is:unread`,
    maxResults: 1,
  })

  return res.data.resultSizeEstimate ?? 0
}
