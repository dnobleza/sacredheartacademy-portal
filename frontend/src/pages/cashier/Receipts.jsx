import PaymentHistory from './PaymentHistory';

/**
 * Receipts and payment history are the same records — this screen exists
 * because a cashier looks for "the receipt" by OR number.
 */
function Receipts() {
  return (
    <PaymentHistory
      title="Receipts"
      description="Every official receipt issued. Search by OR number to find one."
    />
  );
}

export default Receipts;
