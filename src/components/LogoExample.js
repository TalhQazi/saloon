import React from 'react';
import { View, StyleSheet } from 'react-native';
import SarteSalonLogo from './SarteSalonLogo';

// Example usage component
const LogoExample = () => {
    return (
        <View style={styles.container}>
            {/* Default size */}
            <SarteSalonLogo />

            {/* Custom size */}
            <SarteSalonLogo width={300} height={120} />

            {/* Small size for headers */}
            <SarteSalonLogo width={150} height={60} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
});

export default LogoExample;
