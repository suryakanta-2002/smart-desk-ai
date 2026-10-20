
import { useState } from "react";
import { updateUserProfile } from "../api/client";

function Profile({ user, accessToken, onProfileUpdated, onBack }) {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const updatedUser = await updateUserProfile(
        accessToken,
        formData
      );

      setFormData({
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
        email: updatedUser.email || "",
      });

      onProfileUpdated?.(updatedUser);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <button
        type="button"
        className="btn btn-outline-secondary mb-3"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      <div className="card shadow-sm" style={{ maxWidth: "650px" }}>
        <div className="card-body p-4">
          <h3 className="mb-1">My Profile</h3>
          <p className="text-muted mb-4">
            View and update your personal information.
          </p>

          {message && (
            <div className="alert alert-success">{message}</div>
          )}

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="first_name" className="form-label">
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                className="form-control"
                value={formData.first_name}
                onChange={handleChange}
                maxLength={150}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="last_name" className="form-label">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleChange}
                maxLength={150}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
