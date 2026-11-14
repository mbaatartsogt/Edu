import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useCart } from '../../lib/cart';

/** Хуучин /account/checkout/:programId холбоос — хөтөлбөрийг сагсанд нэмээд сагс руу шилжүүлнэ */
export default function Checkout() {
  const { programId } = useParams();
  const { add, countOf } = useCart();
  const done = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!countOf(programId)) add(programId);
    setReady(true);
  }, [programId, add, countOf]);
  return ready ? <Navigate to="/account/cart" replace /> : null;
}
