import React from 'react';
import Svg, { Text, TSpan, Defs, LinearGradient, Stop } from 'react-native-svg';

const SarteSalonLogo = ({ width = 200, height = 80 }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 200 80">
            <Defs>
                <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
                    <Stop offset="50%" stopColor="#F4E5C3" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#C5A028" stopOpacity="1" />
                </LinearGradient>
            </Defs>

            {/* SARTE text */}
            <Text
                x="100"
                y="35"
                fontSize="28"
                fontFamily="serif"
                fontWeight="bold"
                fill="url(#goldGradient)"
                textAnchor="middle"
                letterSpacing="4"
            >
                SARTE
            </Text>

            {/* Stylized S in the middle */}
            <Text
                x="100"
                y="50"
                fontSize="40"
                fontFamily="serif"
                fontWeight="bold"
                fontStyle="italic"
                fill="url(#goldGradient)"
                textAnchor="middle"
            >
                S
            </Text>

            {/* SALON text */}
            <Text
                x="100"
                y="72"
                fontSize="28"
                fontFamily="serif"
                fontWeight="bold"
                fill="url(#goldGradient)"
                textAnchor="middle"
                letterSpacing="4"
            >
                SALON
            </Text>
        </Svg>
    );
};

export default SarteSalonLogo;
