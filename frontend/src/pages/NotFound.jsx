import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="notfound__code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/home" className="btn btn--primary">
        Back to ShopKart
      </Link>
    </div>
  )
}
