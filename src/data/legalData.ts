export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  title: string;
  items: FAQItem[];
}

export const FAQ_DATA: FAQCategory[] = [
  {
    title: "General",
    items: [
      {
        question: "What is GigUp?",
        answer: "GigUp is a Nigerian data reselling platform that lets you buy cheap MTN, GLO, and Airtel data bundles directly from your wallet. We give you 1GB free data when you sign up, and you earn 10% cashback on every purchase."
      },
      {
        question: "How is GigUp different from OPay or PalmPay?",
        answer: "Unlike OPay and PalmPay, GigUp gives you 10% cashback on every data purchase — withdrawable to your bank account. We also give you free 1GB data just for signing up. No hidden charges, no confusing menus. Just cheap data."
      },
      {
        question: "Which networks do you support?",
        answer: "We currently support MTN, GLO, and Airtel data bundles. Airtime top-up and cable TV are coming soon."
      },
      {
        question: "Is GigUp available nationwide?",
        answer: "Yes. GigUp works for any Nigerian phone number on MTN, GLO, or Airtel, anywhere in Nigeria."
      }
    ]
  },
  {
    title: "Account & Registration",
    items: [
      {
        question: "How do I create an account?",
        answer: "Download or open the GigUp app → Enter your phone number → Verify with the OTP sent to you → Set your 4-digit PIN → Your account is ready."
      },
      {
        question: "What do I need to sign up?",
        answer: "Just your Nigerian phone number and a 4-digit PIN of your choice. No email address required."
      },
      {
        question: "I didn't receive my OTP. What should I do?",
        answer: "Wait 60 seconds and tap \"Resend OTP.\" Make sure your phone has network signal. If the problem persists, contact us via support."
      },
      {
        question: "Can I have more than one account?",
        answer: "No. One phone number = one account. Creating multiple accounts is against our terms and may result in a ban."
      },
      {
        question: "How do I delete my account?",
        answer: "Go to Account → Delete Account → Enter your PIN to confirm. All your data will be permanently deleted. Note: you cannot delete your account if you have a pending cashback withdrawal."
      }
    ]
  },
  {
    title: "Wallet & Top-Up",
    items: [
      {
        question: "How do I fund my wallet?",
        answer: "Go to Wallet → Top Up → Enter amount → You'll be redirected to our secure payment page (Flutterwave) → Pay with your card or bank transfer → Your wallet is credited instantly."
      },
      {
        question: "What is the minimum top-up amount?",
        answer: "The minimum wallet top-up is ₦2,000."
      },
      {
        question: "How long does it take for my wallet to be credited?",
        answer: "Instantly after successful payment. If your wallet is not credited within 5 minutes after payment, contact support with your payment reference."
      },
      {
        question: "Can I withdraw money from my wallet?",
        answer: "Your main wallet balance is for buying data only — it cannot be withdrawn. However, your cashback balance can be withdrawn to your bank account once it reaches ₦2,000."
      },
      {
        question: "Is my payment secure?",
        answer: "Yes. All payments are processed by Flutterwave, a licensed and regulated payment processor in Nigeria. GigUp never stores your card details."
      }
    ]
  },
  {
    title: "Buying Data",
    items: [
      {
        question: "How do I buy data?",
        answer: "Go to Buy Data → Select your network (MTN/GLO/Airtel) → Choose a plan → Enter recipient phone number → Tap Buy Now. Data is sent instantly."
      },
      {
        question: "Can I buy data for someone else?",
        answer: "Yes. Just enter their phone number in the recipient field."
      },
      {
        question: "How long does data delivery take?",
        answer: "Instantly in most cases. Rarely, it may take up to 2 minutes. If data is not received after 5 minutes, contact support with your order details."
      },
      {
        question: "What happens if my data purchase fails?",
        answer: "If an order fails, your wallet is automatically refunded immediately. No manual process needed."
      },
      {
        question: "Why is a plan showing as unavailable?",
        answer: "Some plans may be temporarily unavailable due to network downtime from the data provider (this is common with GLO and MTN SME plans). Check back later or choose another plan."
      }
    ]
  },
  {
    title: "Cashback",
    items: [
      {
        question: "How does the 10% cashback work?",
        answer: "Every time you successfully buy data, 10% of the purchase amount is credited to your cashback balance. For example, buying a ₦600 plan earns you ₦60 cashback."
      },
      {
        question: "Where can I see my cashback balance?",
        answer: "On your Home screen and Wallet screen. Your cashback balance is shown separately from your wallet balance."
      },
      {
        question: "How do I withdraw my cashback?",
        answer: "Go to Wallet → Cashback Wallet → Withdraw → Enter your bank details → Submit. You need at least ₦2,000 cashback to withdraw."
      },
      {
        question: "How long does cashback withdrawal take?",
        answer: "Withdrawals are processed manually within 24 hours. You'll receive an in-app notification once paid."
      },
      {
        question: "Can I use my cashback to buy data?",
        answer: "No. Cashback can only be withdrawn to your bank account."
      }
    ]
  },
  {
    title: "Referrals",
    items: [
      {
        question: "How does the referral program work?",
        answer: "Share your unique referral code with friends. When they sign up and use your code, you both get 1GB bonus data. Your referral code is in your Account screen."
      },
      {
        question: "How many people can I refer?",
        answer: "Unlimited. Every successful referral earns you 1GB bonus data."
      },
      {
        question: "When do I receive my referral bonus?",
        answer: "Within minutes of your friend completing registration with your code."
      }
    ]
  },
  {
    title: "Signup Bonus",
    items: [
      {
        question: "What is the signup bonus?",
        answer: "Every new GigUp user receives free data on registration: MTN users get 1GB, GLO users get 1GB, and Airtel users get 1GB."
      },
      {
        question: "When will I receive my signup bonus?",
        answer: "Within minutes of completing registration. Check your phone's data balance."
      },
      {
        question: "I didn't receive my signup bonus. What do I do?",
        answer: "Contact us on support with your registered phone number and we'll resolve it."
      }
    ]
  },
  {
    title: "Security & PIN",
    items: [
      {
        question: "What if I forget my PIN?",
        answer: "Currently, contact support to initiate a PIN reset. We'll verify your identity before resetting."
      },
      {
        question: "Can I change my PIN?",
        answer: "Yes. Go to Account → Change PIN."
      },
      {
        question: "Is my account safe?",
        answer: "Yes. Your PIN is encrypted and never stored in plain text. We never ask for your PIN via phone, WhatsApp, or email. If anyone asks for your PIN, it is a scam."
      }
    ]
  }
];

export const TERMS_OF_SERVICE = {
  lastUpdated: "May 2026",
  sections: [
    {
      title: "1. About GigUp",
      content: "GigUp is a data reselling platform operated in Nigeria that allows users to purchase mobile data bundles using a prepaid wallet system. GigUp is not a licensed financial institution or telecom operator. We act as a data reseller and payment intermediary."
    },
    {
      title: "2. Eligibility",
      content: "To use GigUp, you must be at least 18 years old or have parental/guardian consent; own or have authorised access to the Nigerian phone number used for registration; provide accurate information during registration; and not be prohibited from using the Service under applicable Nigerian law."
    },
    {
      title: "3. Account Registration",
      content: "3.1 You must register with your valid Nigerian phone number and create a 4-digit PIN.\n3.2 You are responsible for maintaining the confidentiality of your PIN. GigUp will never ask for your PIN.\n3.3 One person may only create one account. Duplicate accounts may be terminated without notice.\n3.4 You are fully responsible for all activities that occur under your account."
    },
    {
      title: "4. Wallet & Payments",
      content: "4.1 The GigUp wallet is a prepaid system. You must fund your wallet before making purchases.\n4.2 The minimum wallet top-up is ₦2,000.\n4.3 Payments are processed by Flutterwave, a third-party payment processor. GigUp is not responsible for payment processing errors on Flutterwave's end.\n4.4 Wallet balances are non-transferable between accounts and cannot be withdrawn except as described in Section 6 (Cashback).\n4.5 GigUp reserves the right to reverse or hold wallet credits suspected of being fraudulent."
    },
    {
      title: "5. Data Purchases",
      content: "5.1 Data is fulfilled through our licensed data aggregator (SMEDATA). Delivery is typically instant but may occasionally take up to 5 minutes.\n5.2 In the event of a failed order, the full amount will be refunded to your wallet automatically.\n5.3 GigUp does not guarantee data plan availability. Plans may be temporarily unavailable due to network downtime beyond our control.\n5.4 Data bundles are non-refundable once successfully delivered to the recipient's phone number.\n5.5 You are responsible for entering the correct recipient phone number. GigUp is not liable for data sent to a wrong number due to user error."
    },
    {
      title: "6. Cashback Program",
      content: "6.1 GigUp awards 10% cashback on every successful data purchase to the purchaser's cashback balance.\n6.2 Cashback balances are separate from the wallet and can only be withdrawn to a bank account, not used for purchases.\n6.3 The minimum cashback withdrawal amount is ₦2,000.\n6.4 Withdrawals are processed within 24 hours on business days.\n6.5 GigUp reserves the right to modify, suspend, or terminate the cashback program at any time with prior notice.\n6.6 Cashback earned through fraudulent activity will be forfeited and the account suspended."
    },
    {
      title: "7. Referral Program",
      content: "7.1 Users earn 1GB bonus data for each valid referral (when the referred user completes registration using the referral code).\n7.2 Self-referrals or fake accounts created for referral bonuses are prohibited and will result in account termination.\n7.3 Referral bonuses are non-transferable and have no cash value.\n7.4 GigUp reserves the right to modify or end the referral program at any time."
    },
    {
      title: "8. Prohibited Conduct",
      content: "You agree not to: use GigUp for any unlawful purpose; create fake accounts or use stolen phone numbers; attempt to exploit, hack, or reverse-engineer the GigUp platform; use automated bots or scripts to interact with the Service; abuse the cashback or referral programs; or resell or redistribute data purchased through GigUp for commercial gain without authorisation. Violation of these rules may result in immediate account suspension and forfeiture of wallet balance."
    },
    {
      title: "9. Signup Bonus",
      content: "9.1 The free data signup bonus is offered once per user at GigUp's discretion.\n9.2 The bonus amount may vary by network and is subject to change at any time.\n9.3 GigUp reserves the right to modify or withdraw the signup bonus program without notice."
    },
    {
      title: "10. Service Availability",
      content: "10.1 GigUp aims for 99% uptime but does not guarantee uninterrupted service.\n10.2 We may suspend the Service for maintenance, upgrades, or circumstances beyond our control.\n10.3 GigUp is not liable for losses arising from Service downtime."
    },
    {
      title: "11. Account Termination",
      content: "11.1 You may delete your account at any time from the Account settings. Deletion is permanent and irreversible.\n11.2 GigUp reserves the right to suspend or terminate accounts that violate these Terms, with or without notice.\n11.3 Upon termination, any wallet balance remaining will be reviewed. Legitimate balances may be refunded at GigUp's discretion."
    },
    {
      title: "12. Limitation of Liability",
      content: "To the fullest extent permitted by Nigerian law, GigUp shall not be liable for: indirect, incidental, or consequential damages; loss of data, revenue, or profits; or losses arising from network failures, data provider outages, or payment processor errors. GigUp's total liability shall not exceed the amount you paid in the 30 days preceding the claim."
    },
    {
      title: "13. Changes to Terms",
      content: "GigUp reserves the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms. We will notify users of material changes via in-app notification."
    },
    {
      title: "14. Governing Law",
      content: "These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved under Nigerian jurisdiction."
    },
    {
      title: "15. Contact",
      content: "For questions about these Terms, contact us at:\nEmail: support@gigupnigeria.com\nWebsite: gigupnigeria.com"
    }
  ]
};

export const PRIVACY_POLICY = {
  lastUpdated: "May 2026",
  sections: [
    {
      title: "1. Information We Collect",
      content: "1.1 Information you provide: Phone number, Full name, 4-digit PIN (stored in encrypted form), and Bank account details.\n1.2 Information collected automatically: Device type, operating system, IP address, app usage data, and Transaction history.\n1.3 Information from third parties: Payment confirmation from Flutterwave, and OTP delivery status from BulkSMSNigeria."
    },
    {
      title: "2. How We Use Your Information",
      content: "We use your information to: create and manage your account; process wallet top-ups and data purchases; deliver data; calculate and credit cashback; process withdrawal requests; send OTP verification codes and notifications; detect and prevent fraud; improve our Service; and comply with legal obligations."
    },
    {
      title: "3. How We Share Your Information",
      content: "We do not sell your personal data. We share information only with:\n3.1 Service providers: Flutterwave, BulkSMSNigeria, SMEDATA, and Supabase.\n3.2 Legal requirements: As required by Nigerian law or court orders.\n3.3 Business transfers: To new entities under the same protections in case of a merger."
    },
    {
      title: "4. Data Storage & Security",
      content: "4.1 Your data is stored on Supabase servers in the European Union (Ireland) with encryption at rest and in transit.\n4.2 Your PIN is stored as a one-way cryptographic hash.\n4.3 We implement industry-standard measures including HTTPS, JWT authentication, and row-level security.\n4.4 No system is 100% secure. Protect your PIN."
    },
    {
      title: "5. Data Retention",
      content: "5.1 We retain your account data for as long as your account is active.\n5.2 Transaction records may be retained for up to 7 years to comply with Nigerian financial regulations.\n5.3 When you delete your account, your personal data is permanently deleted within 24 hours."
    },
    {
      title: "6. Your Rights (NDPR/NDPA)",
      content: "Under Nigerian data protection law, you have the right to access a copy of your data, request correction of inaccurate data, request deletion of your account and data, obtain your data in a portable format, and object to processing."
    },
    {
      title: "7. Cookies & Tracking",
      content: "The GigUp app does not use tracking cookies. We use minimal local storage (localStorage) only to keep you logged in between sessions."
    },
    {
      title: "8. Children's Privacy",
      content: "GigUp is not intended for users under 18 years of age. We do not knowingly collect personal information from minors."
    },
    {
      title: "9. Push Notifications",
      content: "GigUp sends push notifications for order updates, cashback credits, and account alerts via ntfy.sh. You can disable notifications in your device settings."
    },
    {
      title: "10. Third-Party Links",
      content: "The GigUp app may contain links to third-party services. We are not responsible for the privacy practices of those third parties."
    },
    {
      title: "11. Changes to This Policy",
      content: "We may update this Privacy Policy from time to time. Continued use of GigUp after changes constitutes acceptance of the updated policy."
    },
    {
      title: "12. Contact Us",
      content: "If you have any questions, concerns, or data requests, contact us at: support@gigupnigeria.com or gigupnigeria.com."
    }
  ]
};
