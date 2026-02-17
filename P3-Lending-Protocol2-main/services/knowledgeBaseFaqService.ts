import { ChatMessage } from '../types';

type FaqTemplate = {
  id: string;
  question: string;
  answer: string;
  priority: number;
  keywords: RegExp[];
};

export interface AutoFaqEntry {
  id: string;
  question: string;
  answer: string;
  category: 'FAQ';
  sourceCount: number;
  generatedAt: string;
}

const FAQ_TEMPLATES: readonly FaqTemplate[] = [
  {
    id: 'wallet-connect',
    question: 'Why is my wallet not connecting?',
    answer:
      'Confirm MetaMask or Coinbase Wallet is installed, unlock the wallet, then reconnect from the dashboard. If another wallet extension is active, disable it temporarily and retry.',
    priority: 90,
    keywords: [/wallet/i, /connect/i, /metamask/i, /coinbase wallet/i, /provider/i],
  },
  {
    id: 'switch-to-sepolia',
    question: 'How do I switch to Sepolia?',
    answer:
      'Use the wallet network switch and select Sepolia Testnet (chainId 11155111). Beta actions are gated to Sepolia by default for safety.',
    priority: 100,
    keywords: [/sepolia/i, /network/i, /chain/i, /switch/i, /mainnet/i],
  },
  {
    id: 'insufficient-funds',
    question: 'Why did Execute fail with insufficient funds?',
    answer:
      'Execution needs enough ETH for both transaction value and gas. Fund your wallet with Sepolia test ETH, then retry. The app checks balance before attempting execution.',
    priority: 95,
    keywords: [/insufficient/i, /fund/i, /gas/i, /estimate/i, /execute/i, /transaction failed/i],
  },
  {
    id: 'risk-profile',
    question: 'Why does Risk Profile show limited analysis?',
    answer:
      'When external AI configuration is unavailable, P3 falls back to a deterministic risk model from wallet activity, repayment behavior, KYC state, and trust signals.',
    priority: 85,
    keywords: [/risk/i, /assessment/i, /api key/i, /analysis/i, /score/i],
  },
  {
    id: 'post-loan-request',
    question: 'How do I post a loan request that persists?',
    answer:
      'Submit from New Request, then confirm it appears in My Loan Portfolio. Requests persist after refresh when the insert succeeds against Supabase.',
    priority: 88,
    keywords: [/post request/i, /loan request/i, /new request/i, /persist/i, /submit/i],
  },
  {
    id: 'find-matches',
    question: 'How does Find Matches work?',
    answer:
      'Matches are filtered against the selected request using amount, reputation floor, and optional loan type/terms constraints. The results are request-specific, not a global feed.',
    priority: 86,
    keywords: [/find matches/i, /match/i, /offer/i, /filter/i, /loan offers/i],
  },
  {
    id: 'waitlist-invites',
    question: 'How do staged waitlist invites work?',
    answer:
      'Admins invite users in controlled batches. Invited users receive onboarding access through Netlify Identity, while admin tools track active users and pending invites.',
    priority: 70,
    keywords: [/waitlist/i, /invite/i, /identity/i, /onboard/i, /early access/i],
  },
  {
    id: 'live-agent',
    question: 'How can I reach a live support agent?',
    answer:
      'Use the support chat and request escalation. The system creates an internal ticket and notifies the admin support channel so an agent can continue the thread.',
    priority: 92,
    keywords: [/agent/i, /human/i, /support/i, /ticket/i, /escalat/i],
  },
];

const DEFAULT_FAQ_ORDER = [
  'switch-to-sepolia',
  'insufficient-funds',
  'wallet-connect',
  'risk-profile',
  'post-loan-request',
  'live-agent',
];

const MIN_FAQ_COUNT = 6;

const isCustomerSupportMessage = (message: ChatMessage): boolean =>
  message.type === 'CUSTOMER_SUPPORT' && message.role === 'CUSTOMER';

export const deriveFaqSignals = (messages: ChatMessage[]): Record<string, number> => {
  const scores = FAQ_TEMPLATES.reduce<Record<string, number>>((acc, template) => {
    acc[template.id] = 0;
    return acc;
  }, {});

  for (const message of messages) {
    if (!isCustomerSupportMessage(message)) {
      continue;
    }

    const text = message.message ?? '';
    for (const template of FAQ_TEMPLATES) {
      if (template.keywords.some((pattern) => pattern.test(text))) {
        scores[template.id] += 1;
      }
    }
  }

  return scores;
};

export const buildAutoFaqEntries = (
  messages: ChatMessage[],
  nowIso: string = new Date().toISOString(),
): AutoFaqEntry[] => {
  const scores = deriveFaqSignals(messages);

  const sortedBySignal = [...FAQ_TEMPLATES].sort((left, right) => {
    const signalDelta = (scores[right.id] ?? 0) - (scores[left.id] ?? 0);
    if (signalDelta !== 0) {
      return signalDelta;
    }

    return right.priority - left.priority;
  });

  const selected = new Set<string>();

  for (const template of sortedBySignal) {
    if ((scores[template.id] ?? 0) > 0) {
      selected.add(template.id);
    }
  }

  for (const fallbackId of DEFAULT_FAQ_ORDER) {
    if (selected.size >= MIN_FAQ_COUNT) {
      break;
    }
    selected.add(fallbackId);
  }

  for (const template of sortedBySignal) {
    if (selected.size >= MIN_FAQ_COUNT) {
      break;
    }
    selected.add(template.id);
  }

  return sortedBySignal
    .filter((template) => selected.has(template.id))
    .map((template) => ({
      id: template.id,
      question: template.question,
      answer: template.answer,
      category: 'FAQ' as const,
      sourceCount: scores[template.id] ?? 0,
      generatedAt: nowIso,
    }));
};
