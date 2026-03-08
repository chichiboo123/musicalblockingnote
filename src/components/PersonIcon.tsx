interface PersonIconProps {
  color: string;
  size?: number;
}

const PersonIcon = ({ color, size = 24 }: PersonIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="6" r="4" />
    <path d="M12 12c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
  </svg>
);

export default PersonIcon;
