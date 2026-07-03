import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex flex-col min-h-dvh pb-16">
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
              <h2 className="text-xl font-bold">
                {profile?.name}, {profile?.age}
              </h2>
              <button
                onClick={startEdit}
                className="w-7 h-7 flex items-center justify-center rounded-full active:bg-gray-100 transition shrink-0"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <p className="text-gray-500 text-sm">
              {profile?.branch} &middot; {profile?.year}
            </p>
            <p className="text-gray-400 text-sm capitalize">
              {profile?.gender?.toLowerCase()} &middot; Interested in {profile?.preference?.toLowerCase()}
            </p>
            {profile?.bio && (
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-center text-sm text-gray-400 active:text-gray-600 transition py-2"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh pb-16">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Edit profile</h1>
        <button
          onClick={cancelEdit}
          className="text-sm text-gray-500 active:text-gray-700 transition font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
        <div>
          <p className="text-sm font-medium mb-2">Photos ({photoCount}/{MAX_PHOTOS})</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
              const existing = existingPhotos[i]
              const newPhoto = !existing ? newPhotos[i - existingPhotos.length] : null
              const photo = existing || newPhoto

              return (
                <div
                  key={i}
                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
                    photo ? 'border-transparent' : 'border-gray-300'
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
          <label className="text-sm font-medium mb-1.5 block">Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
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

        <PillSelector label="Gender" options={GENDERS} value={form.gender} onChange={(v) => update('gender', v)} />
        <PillSelector label="Interested in" options={PREFERENCES} value={form.preference} onChange={(v) => update('preference', v)} />

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
          <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/150</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
