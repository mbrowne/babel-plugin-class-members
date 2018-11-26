class Demo {
    let static foo, bar;
    const static z = 0;
    // static aPublicStaticProp = 0;

    test() {
        foo = 1;
        bar = 2;
        console.log(foo, bar, z);
    }
}
