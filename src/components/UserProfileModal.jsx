import { useNavigate } from 'react-router-dom'

export default function UserProfileModal({ profile, onClose }) {
  const navigate = useNavigate()

  if (!profile) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-[430px] max-h-[90dvh] rounded-t-3xl sm:rounded-3xl overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white text-lg leading-none"
        >
          ✕
        </button>

        {profile.photos?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 snap-x snap-mandatory scrollbar-none">
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

        <div className="px-6 pt-3 pb-6">
          <h2 className="text-xl font-bold">
            {profile.name}, {profile.age}
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {profile.branch} &middot; {profile.year}
          </p>
          {profile.bio && (
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">{profile.bio}</p>
          )}

          <button
            onClick={() => {
              onClose()
              navigate('/matches')
            }}
            className="w-full mt-6 bg-black text-white rounded-xl py-3.5 font-medium active:opacity-90 transition"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}
