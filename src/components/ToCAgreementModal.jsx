import { useState } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'

const tocText = `TERMS AND CONDITIONS

1. Acceptance of Terms
By using Cupid ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the App.

2. Eligibility
You must be at least 18 years old and a current college student to use this App. By using the App, you represent that you meet these requirements.

3. User Conduct
You agree to:
- Provide accurate and truthful information in your profile
- Treat other users with respect and dignity
- Not engage in harassment, bullying, or abusive behavior
- Not share explicit or inappropriate content
- Not create fake profiles or impersonate others
- Not use the App for any illegal purpose

4. Privacy
Your privacy is important to us. We collect and use your information as described in our Privacy Policy. By using the App, you consent to such collection and use.

5. User Content
You retain ownership of the content you post. By posting content, you grant Cupid a non-exclusive, royalty-free license to display and distribute your content within the App.

6. Safety Disclaimer
Cupid is a platform for connecting college students. We are not responsible for the conduct of any user, online or offline. You assume all risk when interacting with other users.

7. Limitation of Liability
Cupid shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.

8. Termination
We reserve the right to suspend or terminate your account at any time for violation of these terms.

9. Changes to Terms
We may update these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.

10. Contact
For questions about these terms, please contact the app administrator.`

export default function ToCAgreementModal({ user, onAccept }) {
  const [checked, setChecked] = useState(false)
  const [agreeing, setAgreeing] = useState(false)

  const handleAgree = async () => {
    if (!checked || agreeing) return
    setAgreeing(true)
    try {
      const { error } = await supabase.from('toc_acceptance').insert({
        user_id: user.id,
      })
      if (error) throw error
      onAccept()
    } catch (err) {
      console.error('T&C acceptance error:', err)
    }
    setAgreeing(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#000926]/95 backdrop-blur-md flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[430px] max-h-[90dvh] bg-[#000926] border border-white/10 rounded-3xl flex flex-col overflow-hidden"
      >
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-sora font-bold text-[#F0F4FF]">Terms &amp; Conditions</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 text-[#A6C5D7] text-sm font-pjs leading-relaxed whitespace-pre-line">
          {tocText}
        </div>

        <div className="px-6 pt-4 pb-6 border-t border-white/10 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#A6C5D7]/40 bg-transparent accent-[#0F52BA]"
            />
            <span className="text-sm font-pjs text-[#A6C5D7] leading-snug">
              I have read and agree to the Terms &amp; Conditions
            </span>
          </label>

          <motion.button
            onClick={handleAgree}
            disabled={!checked || agreeing}
            whileHover={checked ? { scale: 1.02 } : {}}
            whileTap={checked ? { scale: 0.98 } : {}}
            className={`w-full py-3 rounded-2xl text-sm font-pjs font-semibold transition ${
              checked
                ? 'bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white'
                : 'bg-white/10 text-[#A6C5D7]/40 cursor-not-allowed'
            }`}
          >
            {agreeing ? 'Processing…' : 'I Agree'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
