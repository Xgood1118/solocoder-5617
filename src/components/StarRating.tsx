import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ rating, onChange, readonly = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  const handleClick = (value: number) => {
    if (readonly || !onChange) return;
    onChange(value === rating ? 0 : value);
  };

  const handleMouseEnter = (value: number) => {
    if (readonly) return;
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  return (
    <div className={`star-rating ${readonly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`star ${value <= displayRating ? 'filled' : 'empty'}`}
          onClick={() => handleClick(value)}
          onMouseEnter={() => handleMouseEnter(value)}
          onMouseLeave={handleMouseLeave}
          role={readonly ? undefined : 'button'}
          tabIndex={readonly ? undefined : 0}
          onKeyDown={(e) => {
            if (!readonly && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleClick(value);
            }
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}
