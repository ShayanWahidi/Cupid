import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import BlurText from '../components/BlurText'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Other']
const YEARS = ['1st', '2nd', '3rd', '4th']
const GENDERS = ['Man', 'Woman', 'Other']
const PREFERENCES = ['Men', 'Women', 'Both']
const MAX_PHOTOS = 4

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2 text-[#A6C5D7]">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition ${
              value === opt
                ? 'bg-[#0F52BA] border-[#A6C5D7] text-white'
                : 'bg-transparent border-[#A6C5D7]/30 text-[#A6C5D7]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Setup() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    name: '',
    age: '',
    branch: '',
    year: '',
    gender: '',
    preference: '',
    bio: '',
  })

  const [photos, setPhotos] = useState([])

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const step1Valid =
    form.name.trim() &&
    Number(form.age) >= 18 &&
    Number(form.age) <= 30 &&
    form.branch &&
    form.year &&
    form.gender &&
    form.preference

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const remaining = MAX_PHOTOS - photos.length
    const selected = files.slice(0, remaining)
    const newPhotos = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (index) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)

    try {
      const photoUrls = []

      for (const photo of photos) {
        const ext = photo.file.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photo.file)

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        photoUrls.push(urlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        name: form.name.trim(),
        age: Number(form.age),
        branch: form.branch,
        year: form.year,
        gender: form.gender,
        preference: form.preference,
        bio: form.bio.trim(),
        photos: photoUrls,
      })

      if (insertError) throw new Error(insertError.message)

      navigate('/swipe', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gradient-to-b from-[#000926] to-[#0F52BA] px-6">
      <div className="flex items-center justify-between pt-3 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await signOut()
              navigate('/', { replace: true })
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full -ml-1 shrink-0"
          >
            <svg className="w-5 h-5 text-[#D6E6F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-[#A6C5D7]">Step {step} of 2</span>
        </div>
        <div className="flex gap-1.5">
          <div className={`w-6 h-1 rounded-full transition ${step >= 1 ? 'bg-gradient-to-r from-[#A6C5D7] to-[#D6E6F3]' : 'bg-white/10'}`} />
          <div className={`w-6 h-1 rounded-full transition ${step >= 2 ? 'bg-gradient-to-r from-[#A6C5D7] to-[#D6E6F3]' : 'bg-white/10'}`} />
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col"
      >
        {step === 1 && (
          <>
            <BlurText text="About you" className="font-['Pacifico'] text-2xl text-[#D6E6F3]" delay={150} />
            <p className="text-[#A6C5D7] mb-6">Tell us a bit about yourself</p>
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Age</label>
                <input
                  type="number"
                  min={18}
                  max={30}
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  placeholder="18–30"
                  className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Branch</label>
                <select
                  value={form.branch}
                  onChange={(e) => update('branch', e.target.value)}
                  className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base appearance-none text-[#F0F4FF]"
                >
                  <option value="" className="bg-[#000926]">Select branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b} className="bg-[#000926]">{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Year</label>
                <select
                  value={form.year}
                  onChange={(e) => update('year', e.target.value)}
                  className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base appearance-none text-[#F0F4FF]"
                >
                  <option value="" className="bg-[#000926]">Select year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#000926]">{y}</option>
                  ))}
                </select>
              </div>
              <PillSelector label="Gender" options={GENDERS} value={form.gender} onChange={(v) => update('gender', v)} />
              <PillSelector label="Interested in" options={PREFERENCES} value={form.preference} onChange={(v) => update('preference', v)} />
            </div>
            <div className="py-6">
              <motion.button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                whileHover={step1Valid ? { scale: 1.02 } : {}}
                whileTap={step1Valid ? { scale: 0.98 } : {}}
                className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3.5 font-medium disabled:opacity-30 transition"
              >
                Next
              </motion.button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <BlurText text="Photos & bio" className="font-['Pacifico'] text-2xl text-[#D6E6F3]" delay={150} />
            <p className="text-[#A6C5D7] mb-6">Add your photos and a short bio</p>
            <div className="flex flex-col gap-5 flex-1">
              <div>
                <p className="text-sm font-medium mb-2 text-[#A6C5D7]">Photos ({photos.length}/{MAX_PHOTOS})</p>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                    const photo = photos[i]
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-white/5 ${
                          photo ? 'border-transparent' : 'border-[#A6C5D7]/40'
                        }`}
                      >
                        {photo ? (
                          <div className="relative w-full h-full group">
                            <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              x
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[#A6C5D7]/60 text-xl leading-none"
                          >
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-[#A6C5D7]">Bio</label>
                <textarea
                  maxLength={150}
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="Write something about yourself…"
                  rows={4}
                  className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base resize-none text-[#F0F4FF] placeholder-[#A6C5D7]/50"
                />
                <p className="text-xs text-[#A6C5D7]/60 text-right mt-1">{form.bio.length}/150</p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
            <div className="flex gap-3 py-6">
              <motion.button
                onClick={() => setStep(1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 border border-[#A6C5D7]/30 text-[#A6C5D7] rounded-2xl py-3.5 font-medium active:bg-white/5 transition"
              >
                Back
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                disabled={submitting || photos.length === 0}
                whileHover={submitting || photos.length === 0 ? {} : { scale: 1.02 }}
                whileTap={submitting || photos.length === 0 ? {} : { scale: 0.98 }}
                className="flex-[2] bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3.5 font-medium disabled:opacity-30 transition"
              >
                {submitting ? 'Saving…' : 'Create profile'}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
