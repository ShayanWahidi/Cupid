import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Other']
const YEARS = ['1st', '2nd', '3rd', '4th']
const GENDERS = ['Man', 'Woman', 'Other']
const PREFERENCES = ['Men', 'Women', 'Both']
const MAX_PHOTOS = 4

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition ${
              value === opt
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-600 border-gray-300'
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

      const { error: insertError } = await supabase.from('profiles').insert({
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
    <div className="flex flex-col min-h-dvh px-6">
      <div className="flex items-center justify-between pt-3 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await signOut()
              navigate('/', { replace: true })
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 transition -ml-1 shrink-0"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-400">
            Step {step} of 2
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className={`w-6 h-1 rounded-full transition ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`} />
          <div className={`w-6 h-1 rounded-full transition ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
        </div>
      </div>

      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold mb-1">About you</h1>
          <p className="text-gray-400 mb-6">Tell us a bit about yourself</p>

          <div className="flex flex-col gap-5 flex-1">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Your full name"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Age</label>
              <input
                type="number"
                min={18}
                max={30}
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                placeholder="18–30"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Branch</label>
              <select
                value={form.branch}
                onChange={(e) => update('branch', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base appearance-none bg-white"
              >
                <option value="">Select branch</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Year</label>
              <select
                value={form.year}
                onChange={(e) => update('year', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base appearance-none bg-white"
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <PillSelector
              label="Gender"
              options={GENDERS}
              value={form.gender}
              onChange={(v) => update('gender', v)}
            />

            <PillSelector
              label="Interested in"
              options={PREFERENCES}
              value={form.preference}
              onChange={(v) => update('preference', v)}
            />
          </div>

          <div className="py-6">
            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold mb-1">Photos & bio</h1>
          <p className="text-gray-400 mb-6">Add your photos and a short bio</p>

          <div className="flex flex-col gap-5 flex-1">
            <div>
              <p className="text-sm font-medium mb-2">Photos ({photos.length}/{MAX_PHOTOS})</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                  const photo = photos[i]
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
                        photo ? 'border-transparent' : 'border-gray-300'
                      }`}
                    >
                      {photo ? (
                        <div className="relative w-full h-full group">
                          <img
                            src={photo.preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
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
                          className="text-gray-400 text-xl leading-none"
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
              <label className="text-sm font-medium mb-1.5 block">Bio</label>
              <textarea
                maxLength={150}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder="Write something about yourself…"
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-black transition text-base resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {form.bio.length}/150
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="flex gap-3 py-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 rounded-xl py-3.5 font-medium active:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || photos.length === 0}
              className="flex-[2] bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition disabled:opacity-30"
            >
              {submitting ? 'Saving…' : 'Create profile'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
