import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PencilIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Header from '../components/Header'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Other']
const YEARS = ['1st', '2nd', '3rd', '4th']
const GENDERS = ['Man', 'Woman', 'Other']
const PREFERENCES = ['Men', 'Women', 'Both']
const MAX_PHOTOS = 4

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      <p className="text-sm font-pjs font-medium mb-2 text-[#A6C5D7]">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-5 py-2 rounded-full text-sm font-pjs font-semibold border transition ${
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

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    name: '', age: '', branch: '', year: '', gender: '', preference: '', bio: '',
  })
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos] = useState([])
  const [removedPhotos, setRemovedPhotos] = useState([])

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setForm({
        name: data.name || '',
        age: data.age?.toString() || '',
        branch: data.branch || '',
        year: data.year || '',
        gender: data.gender || '',
        preference: data.preference || '',
        bio: data.bio || '',
      })
      setExistingPhotos(data.photos || [])
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const startEdit = () => {
    setError(null)
    setNewPhotos([])
    setRemovedPhotos([])
    setEditing(true)
  }

  const cancelEdit = () => {
    setForm({
      name: profile.name || '',
      age: profile.age?.toString() || '',
      branch: profile.branch || '',
      year: profile.year || '',
      gender: profile.gender || '',
      preference: profile.preference || '',
      bio: profile.bio || '',
    })
    setExistingPhotos(profile.photos || [])
    setNewPhotos([])
    setRemovedPhotos([])
    setError(null)
    setEditing(false)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const remaining = MAX_PHOTOS - (existingPhotos.length - removedPhotos.length) - newPhotos.length
    const selected = files.slice(0, remaining)
    setNewPhotos((prev) => [
      ...prev,
      ...selected.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ])
    e.target.value = ''
  }

  const removeExistingPhoto = (index) => {
    setRemovedPhotos((prev) => [...prev, existingPhotos[index]])
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewPhoto = (index) => {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    try {
      const finalPhotos = [...existingPhotos]

      for (const photo of newPhotos) {
        const ext = photo.file.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photo.file)

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        finalPhotos.push(urlData.publicUrl)
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        user_id: user.id,
        name: form.name.trim(),
        age: Number(form.age),
        branch: form.branch,
        year: form.year,
        gender: form.gender,
        preference: form.preference,
        bio: form.bio.trim(),
        photos: finalPhotos,
      })

      if (upsertError) throw new Error(upsertError.message)

      setProfile((prev) => ({
        ...prev,
        ...form,
        age: Number(form.age),
        photos: finalPhotos,
      }))
      setExistingPhotos(finalPhotos)
      setNewPhotos([])
      setRemovedPhotos([])
      setEditing(false)
    } catch (err) {
      setError(err.message)
    }

    setSaving(false)
  }

  const photoCount = existingPhotos.length + newPhotos.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#000926]">
        <div className="w-6 h-6 border-2 border-[#A6C5D7]/30 border-t-[#A6C5D7] rounded-full animate-spin" />
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex flex-col min-h-dvh pb-16 bg-[#000926]">
        <Header />

        <div className="flex-1 overflow-y-auto">
          {profile?.photos?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-6 py-3 snap-x snap-mandatory scrollbar-none">
              {profile.photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-64 h-80 rounded-2xl object-cover shrink-0 snap-center"
                />
              ))}
            </div>
          )}

          <div className="px-6 pt-4 pb-6 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-sora font-bold text-[#F0F4FF]">
                {profile?.name}, {profile?.age}
              </h2>
              <button
                onClick={startEdit}
                className="w-7 h-7 flex items-center justify-center rounded-full shrink-0"
              >
                <PencilIcon className="w-4 h-4 text-[#A6C5D7]" />
              </button>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-1">
              <p className="font-pjs text-[#A6C5D7] text-sm">Branch & Year</p>
              <p className="font-pjs text-[#F0F4FF]">{profile?.branch} &middot; {profile?.year}</p>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-1">
              <p className="font-pjs text-[#A6C5D7] text-sm">Interests</p>
              <p className="font-pjs text-[#F0F4FF] capitalize">{profile?.gender?.toLowerCase()} &middot; Interested in {profile?.preference?.toLowerCase()}</p>
            </div>
            {profile?.bio && (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-1">
                <p className="font-pjs text-[#A6C5D7] text-sm">Bio</p>
                <p className="font-pjs text-[#F0F4FF] leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-center text-sm text-[#A6C5D7]/60 active:text-[#A6C5D7] transition py-2"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh pb-16 bg-gradient-to-b from-[#000926] to-[#0F52BA]">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-2xl font-['Pacifico'] text-[#D6E6F3]">Edit profile</h1>
        <button
          onClick={cancelEdit}
          className="text-sm text-[#A6C5D7] active:text-[#D6E6F3] transition font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        <div>
          <p className="font-pjs text-sm font-medium mb-2 text-[#A6C5D7]">Photos ({photoCount}/{MAX_PHOTOS})</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
              const existing = existingPhotos[i]
              const newPhoto = !existing ? newPhotos[i - existingPhotos.length] : null
              const photo = existing || newPhoto

              return (
                <div
                  key={i}
                  className={`aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-white/5 ${
                    photo ? 'border-transparent' : 'border-[#A6C5D7]/40'
                  }`}
                >
                  {existing ? (
                    <div className="relative w-full h-full group">
                      <img src={existing} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        x
                      </button>
                    </div>
                  ) : newPhoto ? (
                    <div className="relative w-full h-full group">
                      <img src={newPhoto.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewPhoto(i - existingPhotos.length)}
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
          <label className="font-pjs text-sm font-medium mb-1.5 block text-[#A6C5D7]">Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
          />
        </div>

        <div>
          <label className="font-pjs text-sm font-medium mb-1.5 block text-[#A6C5D7]">Age</label>
          <input
            type="number"
            min={18}
            max={30}
            value={form.age}
            onChange={(e) => update('age', e.target.value)}
            className="w-full bg-white/10 border border-[#A6C5D7]/30 rounded-xl px-4 py-3 outline-none focus:border-[#A6C5D7] transition text-base text-[#F0F4FF] placeholder-[#A6C5D7]/50"
          />
        </div>

        <div>
          <label className="font-pjs text-sm font-medium mb-1.5 block text-[#A6C5D7]">Branch</label>
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
          <label className="font-pjs text-sm font-medium mb-1.5 block text-[#A6C5D7]">Year</label>
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

        <div>
          <label className="font-pjs text-sm font-medium mb-1.5 block text-[#A6C5D7]">Bio</label>
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-[#0F52BA] to-[#A6C5D7] text-white rounded-2xl py-3.5 font-pjs font-semibold disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save'}
        </motion.button>
      </div>
    </div>
  )
}
